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

import { egensotningValidityWarningDays } from '@config';
import authMiddleware from '@middlewares/auth.middleware';
import adminMiddleware from '@middlewares/admin.middleware';
import editorMiddleware from '@middlewares/editor.middleware';
import { HttpException } from '@exceptions/HttpException';
import { ErrandService } from '@services/errand.service';
import { DecisionContext, TemplatingService } from '@services/templating.service';
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
  StatisticsResponse,
  StatusHistoryEntry,
} from '@/data-contracts/rtj-management/data-contracts';

import { maskPersonNumber, maskReporterUserId } from '@utils/util';
import { logger } from '@utils/logger';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Stored decision documents are named "Beslut-<errandNumber>.pdf". */
const DECISION_FILE_PREFIX = 'Beslut-';

/** The egensotning errand type (module). Used to scope statistics to egensotning. */
const EGENSOTNING_TYPE_SLUG = 'EGENSOTNING';

/**
 * A stored decision document is now tagged category=DECISION; the filename prefix
 * is kept as a fallback for documents stored before that category existed.
 */
const isDecisionAttachment = (a: Attachment): boolean =>
  a.category === 'DECISION' || (a.fileName ?? '').startsWith(DECISION_FILE_PREFIX);

/**
 * Author used for notes recording the applicant's own actions (updates,
 * kompletteringar). It is the marker that makes a note citizen-visible — the
 * applicant never sees handläggare-authored notes.
 */
const APPLICANT_NOTE_AUTHOR = 'Sökande';

/** An errand whose decision has been made can no longer be edited by the citizen. */
const TERMINAL_STATUSES = ['DECIDED', 'REJECTED'];

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

/** A citizen errand-list row, enriched with the egensotning validity window. */
interface CitizenErrandListItem extends Errand {
  validFrom?: string;
  validUntil?: string;
  revokedAt?: string;
}

@Controller()
export class ErrandController {
  private readonly errandService = new ErrandService();
  private readonly templatingService = new TemplatingService();

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
        this.errandService.getNotes(id).catch(() => []),
      ]);

    const common = {
      details: this.sanitizeDetails(details),
      sotningsobjekt,
      stakeholders: this.sanitizeStakeholders(stakeholders),
      // The rendered decision document is surfaced via the decision endpoints,
      // not mixed in with the applicant's uploaded attachments.
      attachments: attachments.filter(a => !isDecisionAttachment(a)),
    };

    if (audience === 'citizen') {
      // Hide who is handling the errand from the applicant. Only the applicant's
      // own notes (their updates/kompletteringar) are shown — never handläggare notes.
      // The Eneo validation reasoning is for the handläggare, not the applicant.
      return {
        ...common,
        details: common.details ? { ...common.details, documentValidationDetail: undefined } : common.details,
        errand: { ...this.sanitizeErrand(errand), assignedUserId: undefined },
        statusHistory: statusHistory.map(h => ({ ...h, changedBy: undefined })),
        decisions: decisions.map(d => ({ ...d, createdBy: undefined })),
        notes: notes.filter(n => n.author === APPLICANT_NOTE_AUTHOR),
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

  /** Client config for the citizen UI (e.g. when to warn about expiring beslut). */
  @Get('/citizen/config')
  @UseBefore(authMiddleware)
  citizenConfig(@Res() res: Response) {
    return res.json({ validityWarningDays: egensotningValidityWarningDays() });
  }

  /**
   * Citizen lists their own errands. Decided errands are enriched with the
   * egensotning validity window (validFrom/validUntil/revokedAt) so "Mina beslut"
   * can show it without fetching each errand's full detail.
   */
  @Get('/citizen/errands')
  @UseBefore(authMiddleware)
  async listMine(@Req() req: Request): Promise<CitizenErrandListItem[]> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }
    const result = await this.errandService.findErrands({
      filter: `reporterUserId:'${this.citizenUserId(user)}'`,
      size: 50,
    });
    const errands = (result.errands ?? []).map(e => this.sanitizeErrand(e));

    return Promise.all(
      errands.map(async (e): Promise<CitizenErrandListItem> => {
        if (!e.id || !TERMINAL_STATUSES.includes(e.status ?? '')) return e;
        const details = await this.errandService.getDetails(e.id).catch(() => null);
        if (!details) return e;
        return { ...e, validFrom: details.validFrom, validUntil: details.validUntil, revokedAt: details.revokedAt };
      }),
    );
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

  /** Citizen views/downloads the decision document (PDF) for their own errand. */
  @Get('/citizen/errands/:id/decision/pdf')
  @UseBefore(authMiddleware)
  async citizenDecisionPdf(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const errand = await this.assertCitizenOwns(id, req.session.user!);
    return this.streamDecisionPdf(errand, res);
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
    await this.errandService
      .addNote(id, { author: APPLICANT_NOTE_AUTHOR, body: 'Skickade in komplettering' })
      .catch(e => logger.error(`Could not add supplement note for ${id}: ${(e as Error).message}`));
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

  /**
   * Workflow statistics for the dashboard. Scoped to a single errand type — the
   * egensotning module by default — so it stays correct as other modules are
   * added (pass ?typeSlug=… for those). Optional ?from/&to (ISO) date range.
   */
  @Get('/admin/statistics')
  @UseBefore(authMiddleware, adminMiddleware)
  async statistics(
    @QueryParam('typeSlug') typeSlug: string,
    @QueryParam('from') from: string,
    @QueryParam('to') to: string,
  ): Promise<StatisticsResponse> {
    return this.errandService.getStatistics({
      typeSlug: typeSlug || EGENSOTNING_TYPE_SLUG,
      from: from || undefined,
      to: to || undefined,
    });
  }

  @Get('/admin/errands/:id')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminDetail(@Param('id') id: string): Promise<ErrandDetail> {
    const errand = await this.errandService.getErrand(id);
    return this.buildDetail(errand, 'admin');
  }

  /**
   * Admin assigns themselves as the handläggare. Taking on an errand also moves
   * it to status ONGOING ("Pågående"). A decided/rejected errand is terminal —
   * its handläggare can no longer be changed.
   */
  @Post('/admin/errands/:id/assign')
  @UseBefore(authMiddleware, adminMiddleware, editorMiddleware)
  async assignSelf(@Param('id') id: string, @Req() req: Request): Promise<{ status: string }> {
    const user = req.session.user!;
    const userId = user.username ?? '';

    const errand = await this.errandService.getErrand(id);
    if (errand.status === 'DECIDED' || errand.status === 'REJECTED') {
      throw new HttpException(409, 'Cannot change the handläggare of a decided/rejected errand');
    }

    await this.errandService.assignErrand(id, userId, 'ONGOING');
    await this.errandService
      .addNote(id, {
        author: user.name || userId,
        body: `Tilldelade sig själv som handläggare (${userId}). Status: Pågående.`,
      })
      .catch(e => logger.error(`Could not add assignment note for ${id}: ${(e as Error).message}`));
    logger.info(`Errand ${id} assigned to ${userId} (status -> ONGOING)`);
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
  @UseBefore(authMiddleware, adminMiddleware, editorMiddleware)
  async adminAck(@Param('id') id: string): Promise<{ status: string }> {
    await this.errandService.acknowledgeNotifications(id);
    return { status: 'ok' };
  }

  /**
   * Admin approves/rejects an errand in manual review. An optional free-text
   * `decisionText` (handläggarens motivering) is woven into the decision document,
   * which is rendered and stored as "Beslut-<nr>.pdf" on the errand.
   */
  @Post('/admin/errands/:id/decision')
  @UseBefore(authMiddleware, adminMiddleware, editorMiddleware)
  async adminDecision(
    @Param('id') id: string,
    @BodyParam('approved') approved: boolean,
    @BodyParam('decisionText') decisionText: string,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    if (typeof approved !== 'boolean') {
      throw new HttpException(400, 'approved (boolean) is required');
    }
    const user = req.session.user!;
    const decidedBy = user.name || user.username || 'handläggare';

    await this.errandService.sendProcessMessage(id, {
      messageName: 'manual-review-completed',
      variables: { manuelltGodkand: approved },
    });
    // Record who made the decision (the process decision may use a system actor).
    await this.errandService
      .addNote(id, { author: decidedBy, body: approved ? 'Godkände ärendet' : 'Avslog ärendet' })
      .catch(e => logger.error(`Could not add decision note for ${id}: ${(e as Error).message}`));

    // Render and store the decision document (best-effort — never block the decision).
    try {
      const errand = await this.errandService.getErrand(id);
      const ctx = await this.loadDecisionContext(errand, approved, decisionText || undefined, decidedBy);
      const pdf = await this.templatingService.renderPdf(ctx);
      await this.errandService.addDecisionPdf(id, errand.errandNumber ?? id, pdf);
    } catch (e) {
      logger.error(`Could not render/store decision PDF for ${id}: ${(e as Error).message}`);
    }

    logger.info(`Admin decision for errand ${id} by ${user.username}: manuelltGodkand=${approved}`);
    return { status: 'ok' };
  }

  /** Render the decision document as HTML for the confirmation dialog preview. */
  @Post('/admin/errands/:id/decision/preview')
  @UseBefore(authMiddleware, adminMiddleware, editorMiddleware)
  async decisionPreview(
    @Param('id') id: string,
    @BodyParam('approved') approved: boolean,
    @BodyParam('decisionText') decisionText: string,
    @Req() req: Request,
  ): Promise<{ html: string }> {
    if (typeof approved !== 'boolean') {
      throw new HttpException(400, 'approved (boolean) is required');
    }
    const user = req.session.user!;
    const decidedBy = user.name || user.username || 'handläggare';
    const errand = await this.errandService.getErrand(id);
    const ctx = await this.loadDecisionContext(errand, approved, decisionText || undefined, decidedBy);
    const html = await this.templatingService.renderHtml(ctx);
    return { html };
  }

  /** Admin views/downloads the decision document (PDF). */
  @Get('/admin/errands/:id/decision/pdf')
  @UseBefore(authMiddleware, adminMiddleware)
  async adminDecisionPdf(@Param('id') id: string, @Res() res: Response): Promise<Response> {
    const errand = await this.errandService.getErrand(id);
    return this.streamDecisionPdf(errand, res);
  }

  /**
   * Revoke a granted egensotning (editor only). Records who revoked it and why
   * in an audit note; the revocation (revokedAt/revocationReason) is surfaced via
   * the egensotning details.
   */
  @Post('/admin/errands/:id/decision/revoke')
  @UseBefore(authMiddleware, adminMiddleware, editorMiddleware)
  async revokeDecision(
    @Param('id') id: string,
    @BodyParam('reason') reason: string,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) {
      throw new HttpException(400, 'reason is required');
    }
    const user = req.session.user!;
    const revokedBy = user.name || user.username || 'handläggare';

    await this.errandService.revokeEgensotning(id, trimmed);
    await this.errandService
      .addNote(id, { author: revokedBy, body: `Återkallade beslutet. Anledning: ${trimmed}` })
      .catch(e => logger.error(`Could not add revoke note for ${id}: ${(e as Error).message}`));

    logger.info(`Admin revoked egensotning for errand ${id} by ${user.username}`);
    return { status: 'ok' };
  }

  // ================= Shared =================

  private async streamAttachment(id: string, attachmentId: string, res: Response): Promise<Response> {
    const r = await this.errandService.getAttachmentFile(id, attachmentId);
    res.setHeader('Content-Type', r.contentType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', r.contentDisposition ?? `attachment; filename="${attachmentId}"`);
    return res.send(Buffer.from(r.data));
  }

  /** Gather everything the decision template needs (raw, unmasked — the template masks). */
  private async loadDecisionContext(
    errand: Errand,
    approved: boolean,
    decisionText?: string,
    decidedBy?: string,
  ): Promise<DecisionContext> {
    const id = errand.id!;
    const [details, sotningsobjekt, stakeholders, decisions] = await Promise.all([
      this.errandService.getDetails(id).catch(() => null),
      this.errandService.getSotningsobjekt(id).catch(() => []),
      this.errandService.getStakeholders(id).catch(() => []),
      this.errandService.getDecisions(id).catch(() => []),
    ]);
    return { errand, details, sotningsobjekt, stakeholders, decisions, approved, decisionText, decidedBy };
  }

  /**
   * Serve the decision PDF: prefer a stored "Beslut-*.pdf" (captures the
   * handläggare's edits), otherwise render on demand for a decided/rejected errand.
   */
  private async streamDecisionPdf(errand: Errand, res: Response): Promise<Response> {
    const id = errand.id!;
    const attachments = await this.errandService.listAttachments(id).catch(() => []);
    const stored = attachments.find(a => a.id && isDecisionAttachment(a));
    if (stored?.id) {
      const r = await this.errandService.getAttachmentFile(id, stored.id);
      return this.sendPdf(res, Buffer.from(r.data), stored.fileName ?? `Beslut-${id}.pdf`);
    }

    if (errand.status !== 'DECIDED' && errand.status !== 'REJECTED') {
      throw new HttpException(409, 'No decision available for this errand yet');
    }
    const ctx = await this.loadDecisionContext(errand, errand.status === 'DECIDED');
    const pdf = await this.templatingService.renderPdf(ctx);
    return this.sendPdf(res, pdf, `Beslut-${errand.errandNumber ?? id}.pdf`);
  }

  private sendPdf(res: Response, pdf: Buffer, filename: string): Response {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdf);
  }
}
