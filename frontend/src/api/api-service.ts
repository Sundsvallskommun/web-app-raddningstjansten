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
