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
  /** When the session expires (ISO) — drives the inactivity-warning snackbar. */
  sessionExpiresAt?: string;
  maskedPersonNumber?: string;
  // Admin (SAML / Test SSO) fields
  username?: string;
  email?: string;
  groups?: string[];
  /** Authorization role: 'editor' (full) or 'viewer' (read-only). */
  role?: 'editor' | 'viewer';
  // Admin: full employee record from Employee 2.0
  employee?: PortalPersonData | null;
  // Citizen (Citizen 3.0) fields
  citizen: CitizenInfo | null;
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiService.get<Me>('/me');
  return data;
}

/** Renew the session ("stanna kvar"); returns the new expiry (ISO). */
export async function sessionKeepAlive(): Promise<{ sessionExpiresAt?: string }> {
  const { data } = await apiService.post<{ sessionExpiresAt?: string }>('/session/keepalive');
  return data;
}

// ---- Test SSO (mocked admin login) ----

export interface TestSsoUser {
  id: number;
  name: string;
  role: 'editor' | 'viewer';
}

/** Whether the admin login should offer the Test-SSO button. */
export async function fetchTestSsoConfig(): Promise<{ enabled: boolean }> {
  const { data } = await apiService.get<{ enabled: boolean }>('/admin/test-login/config');
  return data;
}

/** The selectable mock handläggare. */
export async function fetchTestSsoUsers(): Promise<TestSsoUser[]> {
  const { data } = await apiService.get<{ users: TestSsoUser[] }>('/admin/test-login/options');
  return data.users;
}

/** Log in as a mock handläggare with the shared password. */
export async function testSsoLogin(userId: number, password: string): Promise<void> {
  await apiService.post('/admin/test-login', { userId, password });
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
  // Egensotning validity window — only populated for decided errands in the
  // citizen errand list (used by "Mina beslut").
  validFrom?: string;
  validUntil?: string;
  revokedAt?: string;
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
  supplementNeeds?: string[];
  // Eneo (LLM) document validation (on the AUTO_APPROVE branch). The detail is
  // handläggare-only (the BFF strips it from citizen responses).
  documentsValid?: boolean;
  documentValidationDetail?: string;
  documentValidatedAt?: string;
  personnummer?: string;
  fastighetsbeteckning?: string;
  propertyAddress?: string;
  // Ownership declaration carried over from the application.
  ownsProperty?: boolean;
  ownershipMotivation?: string;
  appliesForOtherProperty?: boolean;
  motivering?: string;
  // Validity window of a granted egensotning + revocation bookkeeping.
  validFrom?: string;
  validUntil?: string;
  reminderSentAt?: string;
  revokedAt?: string;
  revocationReason?: string;
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
  | 'DECISION'
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
  id?: string; // present when editing an existing object
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
  ownsProperty?: boolean;
  ownershipMotivation?: string;
  appliesForOtherProperty?: boolean;
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

/** Server-side filter/search params for the errand lists (built from the filter bar). */
export interface ErrandListParams {
  status?: string; // CSV of raw statuses
  title?: string;
  applicant?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  typeSlug?: string;
}

export async function fetchMyErrands(params: ErrandListParams = {}): Promise<Errand[]> {
  const { data } = await apiService.get<Errand[]>('/citizen/errands', { params });
  return data;
}

/** Citizen UI config (e.g. how many days before expiry to warn). */
export async function fetchCitizenConfig(): Promise<{ validityWarningDays: number }> {
  const { data } = await apiService.get<{ validityWarningDays: number }>('/citizen/config');
  return data;
}

export async function fetchAdminErrands(
  page = 0,
  size = 200,
  params: ErrandListParams = {},
): Promise<FindErrandsResponse> {
  const { data } = await apiService.get<FindErrandsResponse>('/admin/errands', {
    params: { page, size, ...params },
  });
  return data;
}

// ---- Statistics (admin workflow overview) ----

export interface StatusCount {
  status?: string;
  count?: number;
}

export interface HandlaggareCount {
  handlaggare?: string;
  count?: number;
}

export interface Statistics {
  total?: number;
  byStatus?: StatusCount[];
  byHandlaggare?: HandlaggareCount[];
  unassigned?: number;
  decidedCount?: number;
  averageHandlaggningstidSeconds?: number;
}

/** Workflow statistics for one errand type (defaults to egensotning), optional date range. */
export async function fetchAdminStatistics(
  typeSlug?: string,
  from?: string,
  to?: string,
): Promise<Statistics> {
  const { data } = await apiService.get<Statistics>('/admin/statistics', {
    params: { typeSlug, from, to },
  });
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

/** Admin approves/rejects an errand in manual review, with optional decision text. */
export async function adminDecision(id: string, approved: boolean, decisionText?: string): Promise<void> {
  await apiService.post(`/admin/errands/${id}/decision`, { approved, decisionText });
}

/** Render the decision document as HTML for the confirmation dialog preview. */
export async function decisionPreview(
  id: string,
  approved: boolean,
  decisionText?: string,
): Promise<{ html: string }> {
  const { data } = await apiService.post<{ html: string }>(`/admin/errands/${id}/decision/preview`, {
    approved,
    decisionText,
  });
  return data;
}

/** Admin assigns themselves as handläggare for an errand. */
export async function assignErrand(id: string): Promise<void> {
  await apiService.post(`/admin/errands/${id}/assign`, {});
}

/** Admin (editor) revokes a granted egensotning, with a required reason. */
export async function revokeDecision(id: string, reason: string): Promise<void> {
  await apiService.post(`/admin/errands/${id}/decision/revoke`, { reason });
}

const baseUrl = () => apiService.defaults.baseURL ?? '/api';

export function citizenAttachmentDownloadUrl(errandId: string, attachmentId: string): string {
  return `${baseUrl()}/citizen/errands/${errandId}/attachments/${attachmentId}/file`;
}

export function adminAttachmentDownloadUrl(errandId: string, attachmentId: string): string {
  return `${baseUrl()}/admin/errands/${errandId}/attachments/${attachmentId}/file`;
}

export function citizenDecisionPdfUrl(errandId: string): string {
  return `${baseUrl()}/citizen/errands/${errandId}/decision/pdf`;
}

export function adminDecisionPdfUrl(errandId: string): string {
  return `${baseUrl()}/admin/errands/${errandId}/decision/pdf`;
}
