import { Body, Controller, Get, Param, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { Request } from 'express';

import authMiddleware from '@middlewares/auth.middleware';
import adminMiddleware from '@middlewares/admin.middleware';
import { HttpException } from '@exceptions/HttpException';
import { ErrandService } from '@services/errand.service';
import { RTJ_DEFAULT_ASSIGNEE, RTJ_PROCESS_DEFINITION } from '@config';
import { Errand, Stakeholder } from '@/data-contracts/rtj-management/data-contracts';
import { logger } from '@utils/logger';

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
}
