import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export { APIS, getApiBase } from "./api-config";

export const CREDENTIALS = process.env.CREDENTIALS === "true";

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
  // personnummer drives both the picker and the citizen-mock seeding; personId is
  // only used in WSO2 mode (in citizen-mock mode the mock assigns the personId).
  CITIZEN_PERSON_ID,
  CITIZEN_PERSON_NUMBER,
  // Shared password required to complete the mock citizen login.
  CITIZEN_LOGIN_PASSWORD,
  // Standalone mock services (no WSO2 token, reachable off-VPN). When a base URL
  // is set, Citizen/Employee calls go to the mock instead of the WSO2 gateway.
  CITIZEN_MOCK_BASE_URL,
  EMPLOYEE_MOCK_BASE_URL,
  // Comma-separated personnummer for the seeded Test-SSO handläggare (parallel to
  // the in-code TEST_HANDLAGGARE list). Only used to seed the employee mock.
  EMPLOYEE_PERSON_NUMBER,
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
  // Comma-separated AD groups with full admin (editor) access: write + read.
  ADMIN_GROUP,
  // Comma-separated AD groups with read-only (viewer) access.
  VIEWER_GROUP,
  // Test SSO: shared password for the mocked handläggare logins. Empty disables it.
  EMPLOYEE_LOGIN_PASSWORD,
  // rtj-management (errand API, separate Dokploy service, no WSO2 token)
  RTJ_MANAGEMENT_BASE_URL,
  RTJ_NAMESPACE,
  RTJ_DEFAULT_ASSIGNEE,
  RTJ_PROCESS_DEFINITION,
  // Templating 2.1 (decision documents)
  EGENSOTNING_DECISION_TEMPLATE,
} = process.env;

/**
 * The deployment mode — a single switch that sets the defaults for every other
 * toggle, so going demo → AD/VPN → production is a one-variable change:
 *  - 'demo' : standalone mocks (off-VPN), mock-BankID citizens, Test SSO available.
 *  - 'ad'   : real WSO2 Citizen/Employee (needs VPN), mock-BankID citizens, fake-idp
 *             SAML for handläggare, Test SSO available.
 *  - 'prod' : real WSO2 + real IdP; citizen login via OneGate BankID; Test SSO off.
 * Per-concern env (mock URLs, SAML_*, CITIZEN_AUTH_MODE) still supplies the data.
 */
export type AppMode = "demo" | "ad" | "prod";
export const appMode = (): AppMode => {
  const m = (process.env.APP_MODE ?? "").trim().toLowerCase();
  return m === "ad" || m === "prod" ? m : "demo";
};

/** Only 'demo' uses the standalone mocks; 'ad'/'prod' go to the WSO2 gateway. */
const useMocks = (): boolean => appMode() === "demo";

/** Base URL of the citizen mock service, trimmed ('' when not configured). */
export const citizenMockBaseUrl = (): string =>
  (CITIZEN_MOCK_BASE_URL ?? "").trim().replace(/\/$/, "");
/** Base URL of the employee mock service, trimmed ('' when not configured). */
export const employeeMockBaseUrl = (): string =>
  (EMPLOYEE_MOCK_BASE_URL ?? "").trim().replace(/\/$/, "");
/** True when Citizen calls should hit the standalone mock instead of WSO2. */
export const citizenMockEnabled = (): boolean =>
  useMocks() && citizenMockBaseUrl() !== "";
/** True when Employee calls should hit the standalone mock instead of WSO2. */
export const employeeMockEnabled = (): boolean =>
  useMocks() && employeeMockBaseUrl() !== "";

/** A selectable citizen for the mock-BankID login. personId is resolved at login
 * time in citizen-mock mode (the mock assigns it); known up-front in WSO2 mode. */
export interface CitizenPerson {
  personId?: string;
  personNumber: string;
  name: string;
}

const splitCsv = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Display + address data for the seeded mock citizens, zipped by index with the
 * personnummer in CITIZEN_PERSON_NUMBER. Real personnummer stay in env; the rest
 * (names, valid Sundsvall/Timrå/Ånge addresses so submit passes the area check)
 * lives here. Used to seed the citizen mock and to label the login picker.
 */
export interface MockCitizenProfile {
  givenname: string;
  lastname: string;
  gender: string;
  realEstateDescription: string;
  address: string;
  postalCode: string;
  city: string;
}

const MOCK_CITIZEN_PROFILES: MockCitizenProfile[] = [
  {
    givenname: "Anna",
    lastname: "Sundberg",
    gender: "K",
    realEstateDescription: "SUNDSVALL STENSTADEN 1:23",
    address: "Storgatan 1",
    postalCode: "852 30",
    city: "SUNDSVALL",
  },
  {
    givenname: "Karin",
    lastname: "Boström",
    gender: "K",
    realEstateDescription: "TIMRÅ BÖLE 1:10",
    address: "Köpmangatan 5",
    postalCode: "861 33",
    city: "TIMRÅ",
  },
];

/** The mock citizens (personnummer from env, profile from code), zipped by index. */
export const mockCitizens = (): Array<
  MockCitizenProfile & { personNumber: string }
> =>
  splitCsv(CITIZEN_PERSON_NUMBER)
    .map((personNumber, i) =>
      MOCK_CITIZEN_PROFILES[i]
        ? { ...MOCK_CITIZEN_PROFILES[i], personNumber }
        : null,
    )
    .filter(
      (c): c is MockCitizenProfile & { personNumber: string } => c !== null,
    );

/**
 * The selectable citizens for the mock login. In citizen-mock mode this is the
 * seeded mock list (friendly names); in WSO2 mode it zips CITIZEN_PERSON_ID and
 * CITIZEN_PERSON_NUMBER (display name resolved from Citizen 3.0 at /me).
 */
export const CITIZEN_PERSONS: CitizenPerson[] = citizenMockEnabled()
  ? mockCitizens().map((c) => ({
      personNumber: c.personNumber,
      name: `${c.givenname} ${c.lastname}`,
    }))
  : splitCsv(CITIZEN_PERSON_ID).map((personId, i) => ({
      personId,
      personNumber: splitCsv(CITIZEN_PERSON_NUMBER)[i] ?? "",
      name: personId.slice(0, 8),
    }));

/** A mocked Test-SSO handläggare. Role is derived from groups (no AD here). */
export interface TestHandlaggare {
  loginName: string;
  givenname: string;
  lastname: string;
  name: string;
  email: string;
  groups: string[];
  personNumber?: string;
}

const HANDLAGGARE_PROFILES: Omit<TestHandlaggare, "personNumber">[] = [
  {
    loginName: "rtj-admin",
    givenname: "Tilda",
    lastname: "Chef",
    name: "Tilda Chef (admin)",
    email: "tilda.chef@rtjmedelpad.se",
    groups: ["Raddningstjansten-AVD-CHEFER"],
  },
  {
    loginName: "rtj-editor",
    givenname: "Hampus",
    lastname: "Handläggare",
    name: "Hampus Handläggare (editor)",
    email: "hampus.handlaggare@rtjmedelpad.se",
    groups: ["Raddningstjansten-AVD-EDITOR"],
  },
  {
    loginName: "rtj-viewer",
    givenname: "Vera",
    lastname: "Läsare",
    name: "Vera Läsare (viewer)",
    email: "vera.lasare@rtjmedelpad.se",
    groups: ["Raddningstjansten-AVD-VIEWER"],
  },
];

/** The Test-SSO handläggare (personnummer from env, used only for mock seeding). */
export const testHandlaggare = (): TestHandlaggare[] =>
  HANDLAGGARE_PROFILES.map((h, i) => ({
    ...h,
    personNumber: splitCsv(EMPLOYEE_PERSON_NUMBER)[i],
  }));

/**
 * True when the citizen SAML SP (OneGate) is configured enough to register the
 * passport strategy and routes. Until OneGate has answered with entryPoint/cert,
 * this is false and the app keeps using the mock login.
 */
export const citizenSamlConfigured = (): boolean =>
  Boolean(
    SAML_CITIZEN_ENTRY_SSO &&
    SAML_CITIZEN_IDP_PUBLIC_CERT &&
    SAML_CITIZEN_CALLBACK_URL,
  );

/**
 * Effective citizen login mode. 'saml' only when explicitly requested AND the SP
 * is actually configured; otherwise 'mock' (the dev/POC fallback).
 */
export const citizenAuthMode = (): "saml" | "mock" => {
  // Production defaults to real OneGate BankID; otherwise opt in via CITIZEN_AUTH_MODE.
  const wantSaml =
    appMode() === "prod" ||
    (CITIZEN_AUTH_MODE ?? "").trim().toLowerCase() === "saml";
  return wantSaml && citizenSamlConfigured() ? "saml" : "mock";
};

/**
 * True when the Test-SSO mock login is usable: a shared password is configured AND
 * we are not in production (the shared-password backdoor must never be exposed in
 * prod). The handläggare are defined in code (TEST_HANDLAGGARE) — no database.
 */
export const testSsoConfigured = (): boolean =>
  appMode() !== "prod" && Boolean((EMPLOYEE_LOGIN_PASSWORD ?? "").trim());

/**
 * How many days before an egensotning's validUntil the citizen should be warned
 * that it is about to expire. Configured via EGENSOTNING_VALIDITY_WARNING_DAYS
 * (defaults to 30).
 */
export const egensotningValidityWarningDays = (): number => {
  const n = Number(process.env.EGENSOTNING_VALIDITY_WARNING_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
};

/** Session lifetime: 20 minutes. Renewed via POST /session/keepalive ("stanna kvar"). */
export const SESSION_MAX_AGE_MS = 20 * 60 * 1000;
