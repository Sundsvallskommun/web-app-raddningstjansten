import { cleanEnv, num, port, str, url } from 'envalid';

// Make sure the essentials are present in the environment before booting.
const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    // Deployment mode: drives mock-vs-WSO2, Test SSO availability and citizen login.
    APP_MODE: str({ default: 'demo', choices: ['demo', 'ad', 'prod'] }),
    PORT: port(),
    BASE_URL_PREFIX: str(),
    SECRET_KEY: str(),
    ORIGIN: str(),
    API_BASE_URL: url(),
    CLIENT_KEY: str(),
    CLIENT_SECRET: str(),
    MUNICIPALITY_ID: str(),
    // Mock citizens. personnummer (required) drives both modes; personId only
    // matters in WSO2 mode (the citizen mock assigns its own).
    CITIZEN_PERSON_ID: str({ default: '' }),
    CITIZEN_PERSON_NUMBER: str(),
    // Required to complete the mock citizen login; empty disables login.
    CITIZEN_LOGIN_PASSWORD: str({ default: '' }),
    // Standalone mock services (no WSO2, off-VPN). Empty = use the WSO2 gateway.
    CITIZEN_MOCK_BASE_URL: str({ default: '' }),
    EMPLOYEE_MOCK_BASE_URL: str({ default: '' }),
    // personnummer for the seeded Test-SSO handläggare (parallel to TEST_HANDLAGGARE).
    EMPLOYEE_PERSON_NUMBER: str({ default: '' }),
    // Citizen login mode: 'mock' (default) or 'saml' (OneGate BankID federation).
    CITIZEN_AUTH_MODE: str({ default: 'mock', choices: ['mock', 'saml'] }),
    // Citizen SAML (OneGate). Optional until the federation is set up.
    SAML_CITIZEN_ENTRY_SSO: str({ default: '' }),
    SAML_CITIZEN_CALLBACK_URL: str({ default: '' }),
    SAML_CITIZEN_ISSUER: str({ default: '' }),
    SAML_CITIZEN_IDP_PUBLIC_CERT: str({ default: '' }),
    SAML_CITIZEN_PRIVATE_KEY: str({ default: '' }),
    SAML_CITIZEN_SUCCESS_REDIRECT: str({ default: '' }),
    SAML_CITIZEN_FAILURE_REDIRECT: str({ default: '' }),
    // Admin SAML against the fake SSO IdP
    SAML_ENTRY_SSO: url(),
    SAML_CALLBACK_URL: url(),
    SAML_SUCCESS_REDIRECT: url(),
    SAML_FAILURE_REDIRECT: url(),
    SAML_ISSUER: str(),
    SAML_IDP_PUBLIC_CERT: str(),
    // Admin (editor) groups; viewer group is optional (read-only access).
    ADMIN_GROUP: str(),
    VIEWER_GROUP: str({ default: '' }),
    // Test SSO (mocked handläggare defined in code). Shared password; empty disables it.
    EMPLOYEE_LOGIN_PASSWORD: str({ default: '' }),
    // rtj-management errand API (separate service, no WSO2 token)
    RTJ_MANAGEMENT_BASE_URL: url(),
    // Days before an egensotning's validUntil to warn the citizen it expires.
    EGENSOTNING_VALIDITY_WARNING_DAYS: num({ default: 30 }),
  });
};

export default validateEnv;
