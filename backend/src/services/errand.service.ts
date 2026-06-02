import FormData from 'form-data';
import { MUNICIPALITY_ID, RTJ_MANAGEMENT_BASE_URL, RTJ_NAMESPACE } from '@config';
import ExternalApiService, { ExternalResponse } from './external-api.service';
import { Attachment, Errand, FindErrandsResponse, Stakeholder } from '@/data-contracts/rtj-management/data-contracts';

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

const namespace = () => RTJ_NAMESPACE || 'EGENSOTNING';

/**
 * Talks to the rtj-management errand API (separate Dokploy service, no WSO2 token).
 * All paths are scoped by {municipalityId}/{namespace}.
 */
export class ErrandService {
  private readonly api = new ExternalApiService(RTJ_MANAGEMENT_BASE_URL || '');

  private base(): string {
    return `/${MUNICIPALITY_ID}/${namespace()}/errands`;
  }

  /** Creates an errand; returns the new errand id parsed from the Location header. */
  public async createErrand(errand: Errand): Promise<string> {
    const res = await this.api.post<void, Errand>(this.base(), errand);
    const location = res.location ?? '';
    const id = location.split('/').filter(Boolean).pop();
    if (!id) {
      throw new Error('Errand created but no id returned in Location header');
    }
    return id;
  }

  public async addStakeholder(errandId: string, stakeholder: Stakeholder): Promise<void> {
    await this.api.post<void, Stakeholder>(`${this.base()}/${errandId}/stakeholders`, stakeholder);
  }

  public async findErrands(params: {
    filter?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<FindErrandsResponse> {
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

  // ---- Attachments ----

  /** Upload a single attachment (multipart/form-data, field name "file"). */
  public async addAttachment(errandId: string, file: UploadFile): Promise<void> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    await this.api.post(`${this.base()}/${errandId}/attachments`, form, { headers: form.getHeaders() });
  }

  public async listAttachments(errandId: string): Promise<Attachment[]> {
    const res = await this.api.get<Attachment[]>(`${this.base()}/${errandId}/attachments`);
    return res.data;
  }

  /** Download the raw file (binary) for an attachment, with its content headers. */
  public async getAttachmentFile(
    errandId: string,
    attachmentId: string,
  ): Promise<ExternalResponse<ArrayBuffer>> {
    return this.api.get<ArrayBuffer>(`${this.base()}/${errandId}/attachments/${attachmentId}/file`, {
      responseType: 'arraybuffer',
    });
  }
}
