import { EMPLOYEE_LOGIN_PASSWORD, testHandlaggare } from '@config';

/**
 * Mocked handläggare ("Test SSO"). The three users (admin/editor/viewer) are
 * defined in code (TEST_HANDLAGGARE) and all log in with the shared
 * EMPLOYEE_LOGIN_PASSWORD. They carry AD-style groups, so the role-based
 * authorization (editor/viewer) is exercised identically to a real SAML login.
 *
 * No database: the previous MySQL store is replaced by the in-code list, and the
 * identities are seeded into the employee mock at startup (mock-seed.service).
 */
export interface TestUser {
  id: number;
  username: string;
  name: string;
  email: string;
  groups: string[];
}

/** All selectable Test-SSO users (id = index in the configured list). */
export const listTestUsers = (): TestUser[] =>
  testHandlaggare().map((h, id) => ({ id, username: h.loginName, name: h.name, email: h.email, groups: h.groups }));

/** A single Test-SSO user by id, or null if out of range. */
export const getTestUser = (id: number): TestUser | null => listTestUsers()[id] ?? null;

/** Validate the shared Test-SSO password. */
export const isValidEmployeePassword = (password?: string): boolean =>
  Boolean(EMPLOYEE_LOGIN_PASSWORD) && password === EMPLOYEE_LOGIN_PASSWORD;
