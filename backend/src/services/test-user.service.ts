import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

import { EMPLOYEE_LOGIN_PASSWORD, TESTSSO_DATABASE_URL, testSsoConfigured } from '@config';
import { logger } from '@utils/logger';

/**
 * Mocked handläggare ("Test SSO"). Instead of a real AD/SAML login, three users
 * are seeded into a small MySQL store and may log in with the shared
 * EMPLOYEE_LOGIN_PASSWORD. They carry the same AD-style groups as the real users,
 * so the role-based authorization (editor/viewer) is exercised identically.
 *
 * The DB is intentionally trivial — it stands in for a future real user store and
 * demonstrates the Dokploy "users-database" service. It stores no passwords (the
 * password is shared and lives in env).
 */
export interface TestUser {
  id: number;
  username: string;
  name: string;
  email: string | null;
  groups: string[];
}

interface TestUserRow extends RowDataPacket {
  id: number;
  username: string;
  name: string;
  email: string | null;
  user_groups: string;
}

/** The three seeded handläggare: one per access level. */
const SEED_USERS: Array<Omit<TestUser, 'id'>> = [
  {
    username: 'rtj-admin',
    name: 'Test Chef (admin)',
    email: 'test-chef@rtjmedelpad.se',
    groups: ['Raddningstjansten-AVD-CHEFER'],
  },
  {
    username: 'rtj-editor',
    name: 'Test Handläggare (editor)',
    email: 'test-editor@rtjmedelpad.se',
    groups: ['Raddningstjansten-AVD-EDITOR'],
  },
  {
    username: 'rtj-viewer',
    name: 'Test Läsare (viewer)',
    email: 'test-viewer@rtjmedelpad.se',
    groups: ['Raddningstjansten-AVD-VIEWER'],
  },
];

let pool: Pool | null = null;

/** Lazily create the connection pool (no-op until Test SSO is configured). */
const getPool = (): Pool => {
  if (!pool) {
    // connectTimeout keeps a misconfigured/offline DB from hanging requests.
    pool = mysql.createPool(`${TESTSSO_DATABASE_URL}?connectTimeout=5000`);
  }
  return pool;
};

const groupsToColumn = (groups: string[]): string => groups.join(',');
const groupsFromColumn = (value: string): string[] =>
  value
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);

const mapRow = (row: TestUserRow): TestUser => ({
  id: row.id,
  username: row.username,
  name: row.name,
  email: row.email,
  groups: groupsFromColumn(row.user_groups),
});

/**
 * Create the table (if missing) and upsert the three seed users. Best-effort and
 * idempotent: logs and swallows errors so a missing/slow DB never blocks boot.
 * Called once at startup.
 */
export const initTestSso = async (): Promise<void> => {
  if (!testSsoConfigured()) {
    logger.info('Test SSO disabled (TESTSSO_DATABASE_URL / EMPLOYEE_LOGIN_PASSWORD not set)');
    return;
  }
  try {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NULL,
        user_groups TEXT NOT NULL
      )
    `);
    for (const u of SEED_USERS) {
      // Upsert so a changed name/groups in the seed list takes effect on restart.
      await db.query(
        `INSERT INTO test_user (username, name, email, user_groups)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), user_groups = VALUES(user_groups)`,
        [u.username, u.name, u.email, groupsToColumn(u.groups)],
      );
    }
    logger.info(`Test SSO ready: seeded ${SEED_USERS.length} users`);
  } catch (e) {
    logger.error(`Test SSO init failed (login will be unavailable): ${(e as Error).message}`);
  }
};

/** All selectable Test-SSO users (ordered by id). */
export const listTestUsers = async (): Promise<TestUser[]> => {
  const [rows] = await getPool().query<TestUserRow[]>('SELECT * FROM test_user ORDER BY id');
  return rows.map(mapRow);
};

/** A single Test-SSO user by id, or null if not found. */
export const getTestUser = async (id: number): Promise<TestUser | null> => {
  const [rows] = await getPool().query<TestUserRow[]>('SELECT * FROM test_user WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
};

/** Validate the shared Test-SSO password. */
export const isValidEmployeePassword = (password?: string): boolean =>
  Boolean(EMPLOYEE_LOGIN_PASSWORD) && password === EMPLOYEE_LOGIN_PASSWORD;
