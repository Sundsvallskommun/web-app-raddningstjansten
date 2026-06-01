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

export interface Me {
  type: 'citizen' | 'admin';
  name: string;
  maskedPersonNumber?: string;
  citizen: CitizenInfo | null;
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiService.get<Me>('/me');
  return data;
}
