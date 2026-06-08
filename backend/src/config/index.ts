import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export { APIS, getApiBase } from './api-config';

export const CREDENTIALS = process.env.CREDENTIALS === 'true';

export const {
  NODE_ENV,
  PORT,
  BASE_URL_PREFIX,
  SECRET_KEY,
  ORIGIN,
  LOG_FORMAT,
  LOG_DIR,
  API_BASE_URL,
  CLIENT_KEY,
  CLIENT_SECRET,
  MUNICIPALITY_ID,
  // Mock-BankID citizens: comma-separated, parallel lists of personId + personnummer.
  CITIZEN_PERSON_ID,
  CITIZEN_PERSON_NUMBER,
  // Shared password required to complete the mock citizen login.
  CITIZEN_LOGIN_PASSWORD,
  // Citizen login mode: 'saml' (OneGate BankID federation) or 'mock' (default).
  CITIZEN_AUTH_MODE,
  // Citizen SAML (OneGate) - a separate Service Provider from the admin SAML below.
  SAML_CITIZEN_ENTRY_SSO,
  SAML_CITIZEN_CALLBACK_URL,
  SAML_CITIZEN_ISSUER,
  SAML_CITIZEN_IDP_PUBLIC_CERT,
  SAML_CITIZEN_PRIVATE_KEY,
  SAML_CITIZEN_SUCCESS_REDIRECT,
  SAML_CITIZEN_FAILURE_REDIRECT,
  // Admin SAML (fake SSO IdP) - Service Provider config
  SAML_ENTRY_SSO,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_SUCCESS_REDIRECT,
  SAML_FAILURE_REDIRECT,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  // Comma-separated allowlist of AD groups permitted to log in as admin
  ADMIN_GROUP,
  // rtj-management (errand API, separate Dokploy service, no WSO2 token)
  RTJ_MANAGEMENT_BASE_URL,
  RTJ_NAMESPACE,
  RTJ_DEFAULT_ASSIGNEE,
  RTJ_PROCESS_DEFINITION,
  // Templating 2.1 (decision documents)
  EGENSOTNING_DECISION_TEMPLATE,
} = process.env;

/** A selectable mock-BankID citizen: personId (for Citizen lookups) + personnummer. */
export interface CitizenPerson {
  personId: string;
  personNumber: string;
}

const splitCsv = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * The mock-BankID citizens, built by zipping CITIZEN_PERSON_ID and
 * CITIZEN_PERSON_NUMBER (parallel comma-separated lists). The display name is
 * fetched from Citizen 3.0 at /me, so it is not configured here.
 */
export const CITIZEN_PERSONS: CitizenPerson[] = splitCsv(CITIZEN_PERSON_ID).map((personId, i) => ({
  personId,
  personNumber: splitCsv(CITIZEN_PERSON_NUMBER)[i] ?? '',
}));

/**
 * True when the citizen SAML SP (OneGate) is configured enough to register the
 * passport strategy and routes. Until OneGate has answered with entryPoint/cert,
 * this is false and the app keeps using the mock login.
 */
export const citizenSamlConfigured = (): boolean =>
  Boolean(SAML_CITIZEN_ENTRY_SSO && SAML_CITIZEN_IDP_PUBLIC_CERT && SAML_CITIZEN_CALLBACK_URL);

/**
 * Effective citizen login mode. 'saml' only when explicitly requested AND the SP
 * is actually configured; otherwise 'mock' (the dev/POC fallback).
 */
export const citizenAuthMode = (): 'saml' | 'mock' =>
  (CITIZEN_AUTH_MODE ?? '').trim().toLowerCase() === 'saml' && citizenSamlConfigured() ? 'saml' : 'mock';
