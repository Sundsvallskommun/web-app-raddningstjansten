export type UserType = 'citizen' | 'admin';

/**
 * The shape we store in the session after a (mock) login.
 * personNumber is only kept server-side and is masked before reaching the client.
 */
export interface SessionUser {
  type: UserType;
  /** Citizen personId (uuid) used for Citizen 3.0 lookups */
  personId: string;
  name: string;
  /** Raw personal number - NEVER serialize this to the client */
  personNumber?: string;
}
