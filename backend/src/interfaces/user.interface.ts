export type UserType = 'citizen' | 'admin';

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
}
