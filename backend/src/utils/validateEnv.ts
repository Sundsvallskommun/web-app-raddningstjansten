import { cleanEnv, port, str, url } from 'envalid';

// Make sure the essentials are present in the environment before booting.
const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    BASE_URL_PREFIX: str(),
    SECRET_KEY: str(),
    ORIGIN: str(),
    API_BASE_URL: url(),
    CLIENT_KEY: str(),
    CLIENT_SECRET: str(),
    MUNICIPALITY_ID: str(),
    CITIZEN_PERSON_ID: str(),
    CITIZEN_PERSON_NUMBER: str(),
    // Admin SAML against the fake SSO IdP
    SAML_ENTRY_SSO: url(),
    SAML_CALLBACK_URL: url(),
    SAML_SUCCESS_REDIRECT: url(),
    SAML_FAILURE_REDIRECT: url(),
    SAML_ISSUER: str(),
    SAML_IDP_PUBLIC_CERT: str(),
    ADMIN_GROUP: str(),
    // rtj-management errand API (separate service, no WSO2 token)
    RTJ_MANAGEMENT_BASE_URL: url(),
  });
};

export default validateEnv;
