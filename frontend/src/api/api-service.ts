import axios from 'axios';

/**
 * Axios instance pointed at the BFF. withCredentials so the session cookie
 * is sent with every request.
 */
export const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

export interface CitizenInfo {
  givenname?: string | null;
  lastname?: string | null;
  gender?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  municipality?: string | null;
  realEstateDescription?: string | null;
}

export interface PortalPersonData {
  personid?: string;
  givenname?: string | null;
  lastname?: string | null;
  fullname?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  workPhone?: string | null;
  mobilePhone?: string | null;
  extraMobilePhone?: string | null;
  aboutMe?: string | null;
  email?: string | null;
  mailNickname?: string | null;
  company?: string | null;
  companyId?: number;
  orgTree?: string | null;
  referenceNumber?: string | null;
  isManager?: boolean;
  loginName?: string | null;
  fullOrgTree?: string | null;
}

export interface Me {
  type: 'citizen' | 'admin';
  name: string;
  maskedPersonNumber?: string;
  // Admin (SAML) fields
  username?: string;
  email?: string;
  groups?: string[];
  // Admin: full employee record from Employee 2.0
  employee?: PortalPersonData | null;
  // Citizen (Citizen 3.0) fields
  citizen: CitizenInfo | null;
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiService.get<Me>('/me');
  return data;
}

// ---- Engagements (firmatecknare / egen firma) ----

export interface Engagement {
  organizationNumber: string;
  name: string;
  isAuthorizedSignatory: boolean;
  isSoleTrader: boolean;
}

export async function fetchEngagements(): Promise<Engagement[]> {
  const { data } = await apiService.get<Engagement[]>('/citizen/engagements');
  return data;
}

// ---- Errands (egensotning v2.2) ----

export interface Errand {
  id?: string;
  errandNumber?: string;
  typeSlug?: string;
  title?: string;
  status?: string;
  description?: string;
  priority?: string;
  reporterUserId?: string;
  assignedUserId?: string;
  applicantEmail?: string;
  created?: string;
  modified?: string;
  touched?: string;
}

export interface ContactChannel {
  key?: string;
  value?: string;
}

export interface Stakeholder {
  id?: string;
  externalId?: string;
  externalIdType?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  contactChannels?: ContactChannel[];
}

export interface Sotningsobjekt {
  id?: string;
  typ?: string;
  fabrikat?: string;
  tillverkningsar?: number;
  bransleslag?: string;
  branslemangd?: string;
  sotningsintervallVeckor?: number;
}

export interface EgensotningDetails {
  bilagaPresent?: boolean;
  registeredAtProperty?: boolean;
  reapplicationOk?: boolean;
  lastOutcome?: string;
  manualReviewReason?: string;
  lastVerifiedAt?: string;
  personnummer?: string;
  fastighetsbeteckning?: string;
  propertyAddress?: string;
}

export interface Decision {
  id?: string;
  decisionType?: string;
  value?: string;
  description?: string;
  createdBy?: string;
  created?: string;
}

export interface StatusHistoryEntry {
  id?: string;
  fromStatus?: string;
  toStatus?: string;
  changedBy?: string;
  changedAt?: string;
}

export interface Note {
  id?: string;
  body?: string;
  author?: string;
  created?: string;
}

export type AttachmentCategory =
  | 'DELEGATION'
  | 'COMPETENCE'
  | 'BRANDSKYDDSKONTROLL'
  | 'UTBILDNINGSINTYG'
  | 'OTHER';

export interface Attachment {
  id?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  category?: AttachmentCategory;
  created?: string;
}

export interface ErrandDetail {
  errand: Errand;
  details: EgensotningDetails | null;
  sotningsobjekt: Sotningsobjekt[];
  stakeholders: Stakeholder[];
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  decisions: Decision[];
  notes: Note[];
}

export interface PagingMeta {
  page?: number;
  limit?: number;
  count?: number;
  totalRecords?: number;
  totalPages?: number;
}

export interface FindErrandsResponse {
  errands?: Errand[];
  _meta?: PagingMeta;
}

export interface SotningsobjektInput {
  typ: string;
  fabrikat?: string;
  tillverkningsar?: number;
  bransleslag?: string;
  branslemangd?: string;
  sotningsintervallVeckor?: number;
}

export interface EgensotningApplicationInput {
  applicantEmail: string;
  fastighetsbeteckning: string;
  sotningsobjekt: SotningsobjektInput[];
  propertyAddress?: string;
  applicantFirstName?: string;
  applicantLastName?: string;
  applicantAddress?: string;
  applicantZipCode?: string;
  applicantCity?: string;
  applicantCountry?: string;
  applicantPhone?: string;
  description?: string;
}

/** The two typed attachments an egensotning application must include. */
export interface ApplicationAttachments {
  brandskyddskontroll: File;
  utbildningsintyg: File;
}

/**
 * Single-call submission: the JSON `application` part + the two typed file parts
 * `brandskyddskontroll` and `utbildningsintyg` (the server tags each with its
 * matching category). `application` is sent as a plain text field so the BFF
 * reads it via @BodyParam.
 */
export async function submitApplication(
  application: EgensotningApplicationInput,
  attachments: ApplicationAttachments,
): Promise<{ id: string }> {
  const form = new FormData();
  form.append('application', JSON.stringify(application));
  form.append('brandskyddskontroll', attachments.brandskyddskontroll);
  form.append('utbildningsintyg', attachments.utbildningsintyg);
  const { data } = await apiService.post<{ id: string }>('/citizen/applications', form);
  return data;
}

export async function fetchMyErrands(): Promise<Errand[]> {
  const { data } = await apiService.get<Errand[]>('/citizen/errands');
  return data;
}

export async function fetchAdminErrands(page = 0, size = 20): Promise<FindErrandsResponse> {
  const { data } = await apiService.get<FindErrandsResponse>('/admin/errands', { params: { page, size } });
  return data;
}

export async function fetchCitizenErrand(id: string): Promise<ErrandDetail> {
  const { data } = await apiService.get<ErrandDetail>(`/citizen/errands/${id}`);
  return data;
}

/** Citizen supplements an errand awaiting completion: upload file(s) + re-verify. */
export async function supplementErrand(id: string, files: File[]): Promise<void> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  await apiService.post(`/citizen/errands/${id}/supplement`, form);
}

export async function fetchAdminErrand(id: string): Promise<ErrandDetail> {
  const { data } = await apiService.get<ErrandDetail>(`/admin/errands/${id}`);
  return data;
}

/** Admin approves/rejects an errand in manual review. */
export async function adminDecision(id: string, approved: boolean): Promise<void> {
  await apiService.post(`/admin/errands/${id}/decision`, { approved });
}

/** Admin assigns themselves as handläggare for an errand. */
export async function assignErrand(id: string): Promise<void> {
  await apiService.post(`/admin/errands/${id}/assign`, {});
}

const baseUrl = () => apiService.defaults.baseURL ?? '/api';

export function citizenAttachmentDownloadUrl(errandId: string, attachmentId: string): string {
  return `${baseUrl()}/citizen/errands/${errandId}/attachments/${attachmentId}/file`;
}

export function adminAttachmentDownloadUrl(errandId: string, attachmentId: string): string {
  return `${baseUrl()}/admin/errands/${errandId}/attachments/${attachmentId}/file`;
}
