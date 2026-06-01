import { Controller, Get, Req, Res } from 'routing-controllers';
import { Request, Response } from 'express';

import { ADMIN_NAME, ADMIN_PERSON_ID, ORIGIN } from '@config';
import { logger } from '@utils/logger';

/**
 * Mocked Entra-ID / AD login, shaped after an OIDC authorization-code redirect flow.
 *
 * Real flow to migrate to:
 *   GET /admin/login          -> 302 to Entra authorize endpoint
 *   GET /admin/auth/callback  -> exchange ?code for tokens, read id_token (oid, name, ...)
 *
 * In this mock /admin/login redirects straight to the callback and the user identity
 * is taken from .env. The browser navigates here as a full page load (not XHR), exactly
 * like the real redirect flow, then lands on the SPA admin dashboard.
 */
@Controller()
export class AdminAuthController {
  @Get('/admin/login')
  login(@Res() res: Response) {
    // Real impl: res.redirect(buildEntraAuthorizeUrl(...))
    return res.redirect('auth/callback?code=mock');
  }

  @Get('/admin/auth/callback')
  callback(@Req() req: Request, @Res() res: Response) {
    // Real impl: exchange req.query.code for tokens, validate id_token.
    req.session.user = {
      type: 'admin',
      personId: ADMIN_PERSON_ID,
      name: ADMIN_NAME ?? 'Administratör',
    };

    logger.info(`Admin login completed (mock) for personId ${ADMIN_PERSON_ID}`);

    const target = `${ORIGIN ?? ''}/admin/dashboard`;
    return res.redirect(target);
  }

  @Get('/admin/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect(`${ORIGIN ?? ''}/admin`);
    });
    return res;
  }
}
