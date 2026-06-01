import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import {
  ADMIN_GROUP,
  SAML_CALLBACK_URL,
  SAML_ENTRY_SSO,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_PRIVATE_KEY,
} from '@config';
import { SessionUser } from '@interfaces/user.interface';
import { logger } from '@utils/logger';

/**
 * Normalize a PEM certificate that may arrive from .env with escaped newlines.
 */
export const normalizeCertificate = (cert?: string): string | undefined => {
  if (!cert) return undefined;
  return cert.replace(/\\n/g, '\n').trim();
};

const normalizeGroup = (group?: string | null): string =>
  (group ?? '').trim().replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').toLowerCase();

/**
 * SAML attribute values for groups can be a single string, a comma-separated
 * string or an array. Return a clean list of group names.
 */
export const parseGroups = (raw: unknown): string[] => {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map(g => String(g).trim()).filter(Boolean);
};

/** Groups (from .env ADMIN_GROUP, comma-separated) allowed to log in as admin. */
const allowedAdminGroups = (): string[] => parseGroups(ADMIN_GROUP).map(normalizeGroup);

export const isAllowedAdmin = (groups: string[]): boolean => {
  const allowed = allowedAdminGroups();
  if (allowed.length === 0) return false;
  return groups.map(normalizeGroup).some(g => allowed.includes(g));
};

export const samlConfig = {
  passReqToCallback: true as const,
  disableRequestedAuthnContext: true,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  callbackUrl: SAML_CALLBACK_URL,
  entryPoint: SAML_ENTRY_SSO,
  issuer: SAML_ISSUER,
  idpCert: normalizeCertificate(SAML_IDP_PUBLIC_CERT) ?? '',
  privateKey: normalizeCertificate(SAML_PRIVATE_KEY),
  logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL,
  wantAssertionsSigned: false,
  wantAuthnResponseSigned: false,
  audience: false as const,
  acceptedClockSkewMs: -1,
};

/**
 * Builds the SAML strategy used to authenticate admins against the fake SSO IdP.
 * The verify callback maps SAML attributes to a SessionUser and enforces group
 * membership (only configured ADMIN_GROUPs may log in).
 */
export const createSamlStrategy = (): SamlStrategy =>
  new SamlStrategy(
    samlConfig,
    // sign-on verify
    ((_req: unknown, profile: Record<string, any>, done: any) => {
      if (!profile) {
        return done(new Error('SAML_MISSING_PROFILE'));
      }

      const givenName = profile.givenName ?? profile.givenname ?? '';
      const surname = profile.surname ?? profile.sn ?? '';
      const email = profile.email ?? '';
      const username = profile.username ?? profile['urn:oid:0.9.2342.19200300.100.1.1'] ?? '';
      const citizenIdentifier = profile.citizenIdentifier ?? '';
      const groups = parseGroups(profile.groups);

      if (!isAllowedAdmin(groups)) {
        logger.warn(`SAML login denied for ${username || email}: groups [${groups.join(', ')}] not permitted`);
        return done(null, false, { message: 'MISSING_PERMISSIONS' });
      }

      const user: SessionUser = {
        type: 'admin',
        name: `${givenName} ${surname}`.trim() || username || 'Administratör',
        username,
        email,
        groups,
        citizenIdentifier,
      };

      logger.info(`SAML login ok for ${username} (groups: ${groups.join(', ')})`);
      return done(null, user);
    }) as any,
    // logout verify
    ((_req: unknown, _profile: unknown, done: any) => done(null, {})) as any,
  );
