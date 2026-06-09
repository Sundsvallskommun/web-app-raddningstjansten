export type UserType = 'citizen' | 'admin';

/**
 * Authorization role for an admin (handläggare). Derived from the AD groups:
 * CHEFER/EDITOR groups grant 'editor' (full read+write), the VIEWER group grants
 * 'viewer' (read-only). The same mapping applies to real SAML logins and the
 * mocked Test-SSO logins.
 */
export type AdminRole = 'editor' | 'viewer';

/**
 * The shape we store in the session after login.
 *
 * Citizen (BankID mock): personId + personNumber.
 * Admin (SAML / fake SSO IdP): username, email, groups and the SAML
 * citizenIdentifier (a Swedish personal number).
 *
 * Raw personal numbers (personNumber / citizenIdentifier) are kept server-side
 * only and masked before they reach the client.
 */
export interface SessionUser {
  type: UserType;
  name: string;

  // Citizen
  personId?: string;
  personNumber?: string;

  // Admin (from SAML attributes)
  username?: string;
  email?: string;
  groups?: string[];
  citizenIdentifier?: string;
  // Admin authorization role derived from groups (editor = write, viewer = read-only).
  role?: AdminRole;
}
