import {
  BodyParam,
  Controller,
  Get,
  Param,
  Post,
  Put,
  QueryParam,
  Req,
  Res,
  UploadedFiles,
  UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';
import multer from 'multer';

import authMiddleware from '@middlewares/auth.middleware';
import adminMiddleware from '@middlewares/admin.middleware';
import { HttpException } from '@exceptions/HttpException';
import { ErrandService } from '@services/errand.service';
import { SessionUser } from '@interfaces/user.interface';
import {
  Attachment,
  Decision,
  EgensotningApplication,
  EgensotningDetails,
  Errand,
  Note,
  Notification,
  Sotningsobjekt,
  Stakeholder,
  StatusHistoryEntry,
} from '@/data-contracts/rtj-management/data-contracts';
import { maskPersonNumber, maskReporterUserId } from '@utils/util';
import { logger } from '@utils/logger';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * An egensotning application carries two typed file parts. multer's `.fields()`
 * is used (not routing-controllers' `@UploadedFile`, whose underlying `.single()`
 * would reject the second field as "Unexpected field"). Parsed parts land on
 * `req.files` keyed by field name; the JSON `application` field lands on req.body.
 */
const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
}).fields([
  { name: 'brandskyddskontroll', maxCount: 1 },
  { name: 'utbildningsintyg', maxCount: 1 },
]);

/** Aggregated view of everything the detail pages render. */
interface ErrandDetail {
  errand: Errand;
  details: EgensotningDetails | null;
  sotningsobjekt: Sotningsobjekt[];
  stakeholders: Stakeholder[];
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  decisions: Decision[];
  notes: Note[];
}

@Controller()
export class ErrandController {
  private readonly errandService = new ErrandService();

  private citizenUserId(user: SessionUser): string {
    return `medborgare-${user.personNumber}`;
  }

  // ---- Personal-number masking (never expose a full personnummer to the client) ----

  private sanitizeErrand(e: Errand): Errand {
    return { ...e, reporterUserId: maskReporterUserId(e.reporterUserId) };
  }

  private sanitizeDetails(d: EgensotningDetails | null): EgensotningDetails | null {
    return d ? { ...d, personnummer: maskPersonNumber(d.personnummer) } : d;
  }

  private sanitizeStakeholders(list: Stakeholder[]): Stakeholder[] {
    return list.map(s =>
      s.externalIdType === 'PERSON' ? { ...s, externalId: maskPersonNumber(s.externalId) } : s,
    );
  }

  private sanitizeNotifications(list: Notification[]): Notification[] {
    return list.map(n => ({
      ...n,
      ownerId: maskReporterUserId(n.ownerId),
      createdBy: maskReporterUserId(n.createdBy),
    }));
  }

  /** Throws unless the logged-in citizen owns the errand. */
  private async assertCitizenOwns(id: string, user: SessionUser): Promise<Errand> {
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    const errand = await this.errandService.getErrand(id);
    if (errand.reporterUserId !== this.citizenUserId(user)) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    return errand;
  }

  /**
   * Fetch the full detail aggregate; tolerate sub-resources that fail/are empty.
   * For a citizen, handläggare identities are stripped (the applicant must not
   * see who is handling their errand).
   */
  private async buildDetail(errand: Errand, audience: 'citizen' | 'admin'): Promise<ErrandDetail> {
    const id = errand.id!;
    const [details, sotningsobjekt, stakeholders, attachments, statusHistory, decisions, notes] =
      await Promise.all([
        this.errandService.getDetails(id).catch(() => null),
        this.errandService.getSotningsobjekt(id).catch(() => []),
        this.errandService.getStakeholders(id).catch(() => []),
        this.errandService.listAttachments(id).catch(() => []),
        this.errandService.getStatusHistory(id).catch(() => []),
        this.errandService.getDecisions(id).catch(() => []),
        audience === 'admin' ? this.errandService.getNotes(id).catch(() => []) : Promise.resolve<Note[]>([]),
      ]);

    const common = {
      details: this.sanitizeDetails(details),
      sotningsobjekt,
      stakeholders: this.sanitizeStakeholders(stakeholders),
      attachments,
    };

    if (audience === 'citizen') {
      // Hide who is handling the errand from the applicant.
      return {
        ...common,
        errand: { ...this.sanitizeErrand(errand), assignedUserId: undefined },
        statusHistory: statusHistory.map(h => ({ ...h, changedBy: undefined })),
        decisions: decisions.map(d => ({ ...d, createdBy: undefined })),
        notes: [],
      };
    }

    return {
      ...common,
      errand: this.sanitizeErrand(errand),
      statusHistory,
      decisions,
      notes,
    };
  }

  // ================= Citizen =================

  /**
   * Citizen submits a complete application in one multipart call: the JSON
   * `application` field plus the two typed file parts `brandskyddskontroll`
   * and `utbildningsintyg` (both required).
   */
  @Post('/citizen/applications')
  @UseBefore(authMiddleware, applicationUpload)
  async submitApplication(
    @Req() req: Request,
    @BodyParam('application') applicationJson: string,
  ): Promise<{ id: string }> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }

    const filesByField = req.files as Record<string, UploadedFileType[]> | undefined;
    const brandskyddskontroll = filesByField?.brandskyddskontroll?.[0];
    const utbildningsintyg = filesByField?.utbildningsintyg?.[0];
    if (!brandskyddskontroll || !utbildningsintyg) {
      throw new HttpException(400, 'Both brandskyddskontroll and utbildningsintyg are required');
    }

    let application: EgensotningApplication;
    try {
      application = JSON.parse(applicationJson);
    } catch {
      throw new HttpException(400, 'Invalid application JSON');
    }

    // Authoritative identity from the session — never trust the client for these.
    application.personnummer = user.personNumber;
    application.reporterUserId = this.citizenUserId(user);

    const id = await this.errandService.submitApplication(application, { brandskyddskontroll, utbildningsintyg });
    return { id };
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
      filter: `reporterUserId:'${this.citizenUserId(user)}'`,
      size: 50,
    });
    return (result.errands ?? []).map(e => this.sanitizeErrand(e));
  }

  /** Citizen reads the full detail of their own errand. */
  @Get('/citizen/errands/:id')
  @UseBefore(authMiddleware)
  async citizenDetail(@Param('id') id: string, @Req() req: Request): Promise<ErrandDetail> {
    const errand = await this.assertCitizenOwns(id, req.session.user!);
    return this.buildDetail(errand, 'citizen');
  }

  /** Citizen downloads an attachment from their own errand. */
  @Get('/citizen/errands/:id/attachments/:attachmentId/file')
  @UseBefore(authMiddleware)
  async citizenDownload(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    await this.assertCitizenOwns(id, req.session.user!);
    return this.streamAttachment(id, attachmentId, res);
  }

  /**
   * Citizen supplements an errand that awaits completion: uploads the requested
   * document(s) and triggers a re-verification via `komplettering-received`.
   */
  @Post('/citizen/errands/:id/supplement')
  @UseBefore(authMiddleware)
  async supplement(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFiles('files', { required: false, options: { limits: { fileSize: MAX_UPLOAD_BYTES } } })
    files: UploadedFileType[],
  ): Promise<{ status: string }> {
    await this.assertCitizenOwns(id, req.session.user!);
    if (!files || files.length === 0) {
      throw new HttpException(400, 'At least one file is required');
    }
    for (const file of files) {
      await this.errandService.addAttachment(id, file);
    }
    await this.errandService.sendProcessMessage(id, { messageName: 'komplettering-received' });
    return { status: 'ok' };
  }

  /** Citizen lists their notifications (across errands) for badges. */
  @Get('/citizen/notifications')
  @UseBefore(authMiddleware)
  async citizenNotifications(@Req() req: Request) {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    const notes = await this.errandService.getNotificationsByOwner(this.citizenUserId(user));
    return this.sanitizeNotifications(notes);
  }

  /** Citizen acknowledges notifications on their own errand. */
  @Put('/citizen/errands/:id/notifications/acknowledged')
  @UseBefore(authMiddleware)
  async citizenAck(@Param('id') id: string, @Req() req: Request): Promise<{ status: string }> {
    await this.assertCitizenOwns(id, req.session.user!);
    await this.errandService.acknowledgeNotifications(id);
    return { status: 'ok' };
  }

  // ================= Admin =================

  @Get('/admin/errands')
  @UseBefore(authMiddleware, adminMiddleware)
  async listAll(@QueryParam('page') page = 0, @QueryParam('size') size = 20) {
    const result = await this.errandService.findErrands({ page, size });
    return { ...result, errands: (result.errands ?? []).map(e => this.sanitizeErrand(e)) };
  }

  @Get('/admin/errands/:id')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminDetail(@Param('id') id: string): Promise<ErrandDetail> {
    const errand = await this.errandService.getErrand(id);
    return this.buildDetail(errand, 'admin');
  }

  /** Admin assigns themselves as the handläggare for an errand. */
  @Post('/admin/errands/:id/assign')
  @UseBefore(authMiddleware, adminMiddleware)
  async assignSelf(@Param('id') id: string, @Req() req: Request): Promise<{ status: string }> {
    const user = req.session.user!;
    const userId = user.username ?? '';
    await this.errandService.assignErrand(id, userId);
    await this.errandService
      .addNote(id, {
        author: user.name || userId,
        body: `Tilldelade sig själv som handläggare (${userId})`,
      })
      .catch(e => logger.error(`Could not add assignment note for ${id}: ${(e as Error).message}`));
    logger.info(`Errand ${id} assigned to ${userId}`);
    return { status: 'ok' };
  }

  @Get('/admin/errands/:id/attachments/:attachmentId/file')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminDownload(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<Response> {
    return this.streamAttachment(id, attachmentId, res);
  }

  @Get('/admin/notifications')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminNotifications(@Req() req: Request) {
    const user = req.session.user!;
    const notes = await this.errandService.getNotificationsByOwner(user.username ?? '');
    return this.sanitizeNotifications(notes);
  }

  @Put('/admin/errands/:id/notifications/acknowledged')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminAck(@Param('id') id: string): Promise<{ status: string }> {
    await this.errandService.acknowledgeNotifications(id);
    return { status: 'ok' };
  }

  /** Admin approves/rejects an errand in manual review. */
  @Post('/admin/errands/:id/decision')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminDecision(
    @Param('id') id: string,
    @BodyParam('approved') approved: boolean,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    if (typeof approved !== 'boolean') {
      throw new HttpException(400, 'approved (boolean) is required');
    }
    const user = req.session.user!;
    await this.errandService.sendProcessMessage(id, {
      messageName: 'manual-review-completed',
      variables: { manuelltGodkand: approved },
    });
    // Record who made the decision (the process decision may use a system actor).
    await this.errandService
      .addNote(id, {
        author: user.name || user.username || 'handläggare',
        body: approved ? 'Godkände ärendet' : 'Avslog ärendet',
      })
      .catch(e => logger.error(`Could not add decision note for ${id}: ${(e as Error).message}`));
    logger.info(`Admin decision for errand ${id} by ${user.username}: manuelltGodkand=${approved}`);
    return { status: 'ok' };
  }

  // ================= Shared =================

  private async streamAttachment(id: string, attachmentId: string, res: Response): Promise<Response> {
    const r = await this.errandService.getAttachmentFile(id, attachmentId);
    res.setHeader('Content-Type', r.contentType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', r.contentDisposition ?? `attachment; filename="${attachmentId}"`);
    return res.send(Buffer.from(r.data));
  }
}
