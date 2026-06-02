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
  CITIZEN_PERSON_ID,
  CITIZEN_PERSON_NUMBER,
  CITIZEN_NAME,
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
} = process.env;
