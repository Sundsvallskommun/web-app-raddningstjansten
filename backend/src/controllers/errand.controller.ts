import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  QueryParam,
  Req,
  Res,
  UploadedFile,
  UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';

import authMiddleware from '@middlewares/auth.middleware';
import adminMiddleware from '@middlewares/admin.middleware';
import { HttpException } from '@exceptions/HttpException';
import { ErrandService } from '@services/errand.service';
import { RTJ_DEFAULT_ASSIGNEE, RTJ_PROCESS_DEFINITION } from '@config';
import { Attachment, Errand, Stakeholder } from '@/data-contracts/rtj-management/data-contracts';
import { logger } from '@utils/logger';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface CreateErrandBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  zipCode?: string;
  city?: string;
  description: string;
  representation:
    | { type: 'PRIVATE' }
    | { type: 'COMPANY'; organizationNumber: string; organizationName: string };
}

@Controller()
export class ErrandController {
  private readonly errandService = new ErrandService();

  /** Citizen submits an egensotning application. BFF builds the errand + applicant stakeholder. */
  @Post('/citizen/errands')
  @UseBefore(authMiddleware)
  async createErrand(@Req() req: Request, @Body() body: CreateErrandBody): Promise<{ id: string }> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }

    const errand: Errand = {
      typeSlug: 'EGENSOTNING',
      title: `Ansökan om egensotning — ${body.address}`,
      description: body.description,
      status: 'REGISTERED',
      priority: 'MEDIUM',
      reporterUserId: `medborgare-${user.personNumber}`,
      assignedUserId: RTJ_DEFAULT_ASSIGNEE || 'bsk-handlaggare',
      applicantEmail: body.email,
      processDefinitionName: RTJ_PROCESS_DEFINITION || 'Hantera ansökan om egensotning',
    };

    const errandId = await this.errandService.createErrand(errand);

    // Build the applicant stakeholder (private person or the chosen company).
    const contactChannels = [
      { key: 'Email', value: body.email },
      ...(body.phone ? [{ key: 'Phone', value: body.phone }] : []),
    ];
    const common = {
      role: 'APPLICANT',
      address: body.address,
      zipCode: body.zipCode,
      city: body.city,
      country: 'SE',
      contactChannels,
    };

    const stakeholder: Stakeholder =
      body.representation.type === 'COMPANY'
        ? {
            ...common,
            externalId: body.representation.organizationNumber,
            externalIdType: 'ORGANIZATION',
            organizationName: body.representation.organizationName,
            firstName: body.firstName,
            lastName: body.lastName,
          }
        : {
            ...common,
            externalId: user.personNumber,
            externalIdType: 'PERSON',
            firstName: body.firstName,
            lastName: body.lastName,
          };

    try {
      await this.errandService.addStakeholder(errandId, stakeholder);
    } catch (error) {
      // The errand is already created; don't fail the submission if the
      // supplementary stakeholder call hiccups.
      logger.error(`Errand ${errandId} created but stakeholder POST failed: ${(error as Error).message}`);
    }

    return { id: errandId };
  }

  /** Citizen lists their own errands. */
  @Get('/citizen/errands')
  @UseBefore(authMiddleware)
  async listMine(@Req() req: Request): Promise<Errand[]> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    const result = await this.errandService.findErrands({
      filter: `reporterUserId:'medborgare-${user.personNumber}'`,
      size: 50,
    });
    return result.errands ?? [];
  }

  /** Admin lists all errands in the namespace (paged). */
  @Get('/admin/errands')
  @UseBefore(authMiddleware, adminMiddleware)
  async listAll(@QueryParam('page') page = 0, @QueryParam('size') size = 20) {
    return this.errandService.findErrands({ page, size });
  }

  /** Admin reads a single errand. */
  @Get('/admin/errands/:id')
  @UseBefore(authMiddleware, adminMiddleware)
  async read(@Param('id') id: string): Promise<Errand> {
    return this.errandService.getErrand(id);
  }

  /** Admin reads an errand's stakeholders. */
  @Get('/admin/errands/:id/stakeholders')
  @UseBefore(authMiddleware, adminMiddleware)
  async readStakeholders(@Param('id') id: string): Promise<Stakeholder[]> {
    return this.errandService.getStakeholders(id);
  }

  // ---- Attachments ----

  /** Citizen uploads one document to their own errand (one file per request). */
  @Post('/citizen/errands/:id/attachments')
  @UseBefore(authMiddleware)
  async uploadAttachment(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFile('file', { options: { limits: { fileSize: MAX_UPLOAD_BYTES } } })
    file: UploadedFileType,
  ): Promise<{ status: string }> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    if (!file) {
      throw new HttpException(400, 'NO_FILE');
    }

    // Only allow uploading to one's own errand.
    const errand = await this.errandService.getErrand(id);
    if (errand.reporterUserId !== `medborgare-${user.personNumber}`) {
      throw new HttpException(403, 'FORBIDDEN');
    }

    await this.errandService.addAttachment(id, file);
    return { status: 'ok' };
  }

  /** Admin lists attachment metadata for an errand. */
  @Get('/admin/errands/:id/attachments')
  @UseBefore(authMiddleware, adminMiddleware)
  async listAttachments(@Param('id') id: string): Promise<Attachment[]> {
    return this.errandService.listAttachments(id);
  }

  /** Admin downloads an attachment's file. */
  @Get('/admin/errands/:id/attachments/:attachmentId/file')
  @UseBefore(authMiddleware, adminMiddleware)
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<Response> {
    const r = await this.errandService.getAttachmentFile(id, attachmentId);
    res.setHeader('Content-Type', r.contentType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', r.contentDisposition ?? `attachment; filename="${attachmentId}"`);
    return res.send(Buffer.from(r.data));
  }
}
