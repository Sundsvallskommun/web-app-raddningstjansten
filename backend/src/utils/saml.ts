import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import {
  ADMIN_GROUP,
  VIEWER_GROUP,
  SAML_CALLBACK_URL,
  SAML_CITIZEN_CALLBACK_URL,
  SAML_CITIZEN_ENTRY_SSO,
  SAML_CITIZEN_IDP_PUBLIC_CERT,
  SAML_CITIZEN_ISSUER,
  SAML_CITIZEN_PRIVATE_KEY,
  SAML_ENTRY_SSO,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_PRIVATE_KEY,
} from '@config';
import { AdminRole, SessionUser } from '@interfaces/user.interface';
import { CitizenService } from '@services/citizen.service';
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

/** Groups with full admin (editor) access — write + read (from ADMIN_GROUP). */
const editorGroups = (): string[] => parseGroups(ADMIN_GROUP).map(normalizeGroup);

/** Groups with read-only (viewer) access (from VIEWER_GROUP). */
const viewerGroups = (): string[] => parseGroups(VIEWER_GROUP).map(normalizeGroup);

/** A user may log in as admin if they belong to an editor OR a viewer group. */
export const isAllowedAdmin = (groups: string[]): boolean => {
  const allowed = [...editorGroups(), ...viewerGroups()];
  if (allowed.length === 0) return false;
  return groups.map(normalizeGroup).some(g => allowed.includes(g));
};

/**
 * Map AD groups to an authorization role. Editor groups (CHEFER/EDITOR) win over
 * the viewer group, so a user in both still gets full access. Defaults to
 * 'viewer' (the safer, read-only role) when only a viewer group matches.
 */
export const roleForGroups = (groups: string[]): AdminRole => {
  const normalized = groups.map(normalizeGroup);
  return normalized.some(g => editorGroups().includes(g)) ? 'editor' : 'viewer';
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
        role: roleForGroups(groups),
      };

      logger.info(`SAML login ok for ${username} (groups: ${groups.join(', ')}, role: ${user.role})`);
      return done(null, user);
    }) as any,
    // logout verify
    ((_req: unknown, _profile: unknown, done: any) => done(null, {})) as any,
  );

/**
 * Citizen SAML config — a separate Service Provider federated against OneGate,
 * whose chosen authentication method is BankID. OneGate performs the BankID
 * dialog and returns the personnummer + name as SAML attributes.
 */
export const citizenSamlConfig = {
  passReqToCallback: true as const,
  disableRequestedAuthnContext: true,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  callbackUrl: SAML_CITIZEN_CALLBACK_URL,
  entryPoint: SAML_CITIZEN_ENTRY_SSO,
  issuer: SAML_CITIZEN_ISSUER,
  idpCert: normalizeCertificate(SAML_CITIZEN_IDP_PUBLIC_CERT) ?? '',
  privateKey: normalizeCertificate(SAML_CITIZEN_PRIVATE_KEY),
  wantAssertionsSigned: false,
  wantAuthnResponseSigned: false,
  audience: false as const,
  acceptedClockSkewMs: -1,
};

const citizenService = new CitizenService();

/** First non-empty SAML attribute value, tolerant of arrays and casing variants. */
const pick = (profile: Record<string, any>, ...keys: string[]): string => {
  for (const key of keys) {
    const raw = profile[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

/**
 * Builds the SAML strategy used to authenticate citizens against OneGate.
 * The verify callback maps the BankID personnummer to a Citizen personId (guid)
 * and stores a citizen SessionUser — the exact shape the mock login produced, so
 * the rest of the app (/me, ownership, submit) is unchanged.
 */
export const createCitizenSamlStrategy = (): SamlStrategy =>
  new SamlStrategy(
    citizenSamlConfig,
    // sign-on verify (async: resolves personnummer -> Citizen personId)
    ((_req: unknown, profile: Record<string, any>, done: any) => {
      void (async () => {
        try {
          if (!profile) return done(new Error('SAML_MISSING_PROFILE'));

          const personNumber = pick(
            profile,
            'citizenIdentifier',
            'personalNumber',
            'personnummer',
            'personNumber',
          ).replace(/\D/g, '');
          const givenName = pick(profile, 'givenname', 'givenName', 'firstname');
          const surname = pick(profile, 'sn', 'surname', 'Surname', 'lastname');

          if (!personNumber) {
            logger.warn('Citizen SAML login denied: assertion is missing a personnummer');
            return done(null, false, { message: 'SAML_MISSING_ATTRIBUTES' });
          }

          let personId = '';
          try {
            personId = await citizenService.getPersonId(personNumber);
          } catch (e) {
            logger.error(`Citizen SAML: Citizen guid lookup failed: ${(e as Error).message}`);
          }
          if (!personId) {
            return done(null, false, { message: 'CITIZEN_LOOKUP_FAILED' });
          }

          const user: SessionUser = {
            type: 'citizen',
            personId,
            personNumber,
            name: `${givenName} ${surname}`.trim() || 'Medborgare',
          };

          logger.info(`Citizen SAML login ok for personId ${personId}`);
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      })();
    }) as any,
    // logout verify
    ((_req: unknown, _profile: unknown, done: any) => done(null, {})) as any,
  );
