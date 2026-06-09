import { Body, Controller, Get, Post, Req, Res } from 'routing-controllers';
import { Request, Response } from 'express';

import { testSsoConfigured } from '@config';
import { SessionUser } from '@interfaces/user.interface';
import { roleForGroups } from '@utils/saml';
import { getTestUser, isValidEmployeePassword, listTestUsers } from '@services/test-user.service';
import { logger } from '@utils/logger';

/**
 * "Test SSO" — a mocked alternative to the real AD/SAML admin login. The three
 * seeded handläggare (admin/editor/viewer) authenticate with the shared
 * EMPLOYEE_LOGIN_PASSWORD and get the same admin SessionUser shape (incl. groups
 * and role) the SAML flow produces, so the rest of the app is unchanged.
 *
 * Disabled (404) unless the user store + shared password are configured. Logout
 * reuses the existing GET /api/saml/logout (it just destroys the session).
 */
@Controller()
export class AdminAuthController {
  /** Tells the admin login whether to offer the Test-SSO button. */
  @Get('/admin/test-login/config')
  config(@Res() res: Response) {
    return res.json({ enabled: testSsoConfigured() });
  }

  /** Lists the selectable mock handläggare (no secrets — name + role only). */
  @Get('/admin/test-login/options')
  async options(@Res() res: Response) {
    if (!testSsoConfigured()) {
      return res.status(404).json({ message: 'TEST_SSO_DISABLED' });
    }
    try {
      const users = await listTestUsers();
      return res.json({
        users: users.map(u => ({ id: u.id, name: u.name, role: roleForGroups(u.groups) })),
      });
    } catch (e) {
      logger.error(`Could not list Test-SSO users: ${(e as Error).message}`);
      return res.status(503).json({ message: 'TEST_SSO_UNAVAILABLE' });
    }
  }

  /** Logs in as the chosen mock handläggare, gated by the shared password. */
  @Post('/admin/test-login')
  async login(
    @Body() body: { userId?: number; password?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!testSsoConfigured()) {
      return res.status(404).json({ message: 'TEST_SSO_DISABLED' });
    }
    if (!isValidEmployeePassword(body?.password)) {
      return res.status(401).json({ status: 'failed', hintCode: 'wrongPassword' });
    }

    const user = typeof body?.userId === 'number' ? await getTestUser(body.userId).catch(() => null) : null;
    if (!user) {
      return res.status(400).json({ status: 'failed', hintCode: 'noUser' });
    }

    const sessionUser: SessionUser = {
      type: 'admin',
      name: user.name,
      username: user.username,
      email: user.email ?? '',
      groups: user.groups,
      role: roleForGroups(user.groups),
      citizenIdentifier: '',
    };
    req.session.user = sessionUser;

    return new Promise<Response>(resolve => {
      req.session.save(err => {
        if (err) {
          logger.error(`Could not save Test-SSO session: ${err.message}`);
          return resolve(res.status(500).json({ status: 'failed', hintCode: 'sessionError' }));
        }
        logger.info(`Test SSO login ok for ${user.username} (role: ${sessionUser.role})`);
        return resolve(res.json({ status: 'ok' }));
      });
    });
  }
}
