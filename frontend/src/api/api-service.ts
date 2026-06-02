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
  city?: string | null;
  municipality?: string | null;
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

// ---- Errands (egensotning) ----

export interface CreateErrandInput {
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

export async function createErrand(input: CreateErrandInput): Promise<{ id: string }> {
  const { data } = await apiService.post<{ id: string }>('/citizen/errands', input);
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

export async function fetchErrand(id: string): Promise<Errand> {
  const { data } = await apiService.get<Errand>(`/admin/errands/${id}`);
  return data;
}

export async function fetchStakeholders(id: string): Promise<Stakeholder[]> {
  const { data } = await apiService.get<Stakeholder[]>(`/admin/errands/${id}/stakeholders`);
  return data;
}
