import FormData from 'form-data';
import { MUNICIPALITY_ID, RTJ_MANAGEMENT_BASE_URL, RTJ_NAMESPACE } from '@config';
import ExternalApiService, { ExternalResponse } from './external-api.service';
import {
  Attachment,
  Decision,
  EgensotningApplication,
  EgensotningDetails,
  Errand,
  FindErrandsResponse,
  Note,
  Notification,
  ProcessMessageRequest,
  Sotningsobjekt,
  Stakeholder,
  StatusHistoryEntry,
} from '@/data-contracts/rtj-management/data-contracts';

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** The two typed attachments an egensotning application must include. */
export interface ApplicationAttachments {
  brandskyddskontroll: UploadFile;
  utbildningsintyg: UploadFile;
}

const namespace = () => RTJ_NAMESPACE || 'EGENSOTNING';

/**
 * Talks to the rtj-management egensotning API (separate Dokploy service, no WSO2 token).
 */
export class ErrandService {
  private readonly api = new ExternalApiService(RTJ_MANAGEMENT_BASE_URL || '');

  private nsBase(): string {
    return `/${MUNICIPALITY_ID}/${namespace()}`;
  }
  private base(): string {
    return `${this.nsBase()}/errands`;
  }

  // ---- Single-call application submission ----

  /**
   * Submit a complete egensotning application in one atomic multipart call:
   * the JSON `application` part + the two typed file parts `brandskyddskontroll`
   * and `utbildningsintyg` (the server tags them with the matching category).
   * Returns the new errand id.
   */
  public async submitApplication(application: EgensotningApplication, attachments: ApplicationAttachments): Promise<string> {
    const form = new FormData();
    form.append('application', JSON.stringify(application), { contentType: 'application/json' });
    const append = (field: 'brandskyddskontroll' | 'utbildningsintyg', file: UploadFile) =>
      form.append(field, file.buffer, { filename: file.originalname, contentType: file.mimetype });
    append('brandskyddskontroll', attachments.brandskyddskontroll);
    append('utbildningsintyg', attachments.utbildningsintyg);
    const res = await this.api.post<void>(`${this.nsBase()}/egensotning/applications`, form, {
      headers: form.getHeaders(),
    });
    const id = (res.location ?? '').split('/').filter(Boolean).pop();
    if (!id) {
      throw new Error('Application created but no id returned in Location header');
    }
    return id;
  }

  // ---- Reads ----

  public async findErrands(params: { filter?: string; page?: number; size?: number; sort?: string }): Promise<FindErrandsResponse> {
    const res = await this.api.get<FindErrandsResponse>(this.base(), {
      params: {
        ...(params.filter ? { filter: params.filter } : {}),
        page: params.page ?? 0,
        size: params.size ?? 20,
        ...(params.sort ? { sort: params.sort } : {}),
      },
    });
    return res.data;
  }

  public async getErrand(errandId: string): Promise<Errand> {
    const res = await this.api.get<Errand>(`${this.base()}/${errandId}`);
    return res.data;
  }

  public async getStakeholders(errandId: string): Promise<Stakeholder[]> {
    const res = await this.api.get<Stakeholder[]>(`${this.base()}/${errandId}/stakeholders`);
    return res.data;
  }

  public async getDetails(errandId: string): Promise<EgensotningDetails> {
    const res = await this.api.get<EgensotningDetails>(`${this.base()}/${errandId}/egensotning-details`);
    return res.data;
  }

  public async getSotningsobjekt(errandId: string): Promise<Sotningsobjekt[]> {
    const res = await this.api.get<Sotningsobjekt[]>(`${this.base()}/${errandId}/sotningsobjekt`);
    return res.data;
  }

  public async getStatusHistory(errandId: string): Promise<StatusHistoryEntry[]> {
    const res = await this.api.get<StatusHistoryEntry[]>(`${this.base()}/${errandId}/status-history`);
    return res.data;
  }

  public async getDecisions(errandId: string): Promise<Decision[]> {
    const res = await this.api.get<Decision[]>(`${this.base()}/${errandId}/decisions`);
    return res.data;
  }

  // ---- Attachments ----

  public async listAttachments(errandId: string): Promise<Attachment[]> {
    const res = await this.api.get<Attachment[]>(`${this.base()}/${errandId}/attachments`);
    return res.data;
  }

  /** Add a single attachment (multipart, field name "file") to an existing errand. */
  public async addAttachment(errandId: string, file: UploadFile): Promise<void> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    await this.api.post(`${this.base()}/${errandId}/attachments`, form, { headers: form.getHeaders() });
  }

  public async getAttachmentFile(errandId: string, attachmentId: string): Promise<ExternalResponse<ArrayBuffer>> {
    return this.api.get<ArrayBuffer>(`${this.base()}/${errandId}/attachments/${attachmentId}/file`, {
      responseType: 'arraybuffer',
    });
  }

  // ---- Notifications ----

  public async getNotificationsByOwner(ownerId: string): Promise<Notification[]> {
    const res = await this.api.get<Notification[]>(`${this.nsBase()}/notifications`, { params: { ownerId } });
    return res.data;
  }

  public async acknowledgeNotifications(errandId: string): Promise<void> {
    await this.api.put<void>(`${this.base()}/${errandId}/notifications/acknowledged`);
  }

  // ---- Notes (audit trail of who did what) ----

  public async getNotes(errandId: string): Promise<Note[]> {
    const res = await this.api.get<Note[]>(`${this.base()}/${errandId}/notes`);
    return res.data;
  }

  public async addNote(errandId: string, note: { body: string; author?: string }): Promise<void> {
    await this.api.post(`${this.base()}/${errandId}/notes`, note);
  }

  // ---- Assignment ----

  /** Assign a handläggare and optionally move the errand to a new status. */
  public async assignErrand(errandId: string, assignedUserId: string, status?: string): Promise<void> {
    await this.api.patch(`${this.base()}/${errandId}`, { assignedUserId, ...(status ? { status } : {}) });
  }

  // ---- Process messages (handläggare actions) ----

  public async sendProcessMessage(errandId: string, body: ProcessMessageRequest): Promise<void> {
    await this.api.post<void, ProcessMessageRequest>(`${this.base()}/${errandId}/process-messages`, body);
  }
}
