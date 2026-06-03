import { randomUUID } from 'node:crypto';
import { Body, Controller, Get, Post, Req, Res } from 'routing-controllers';
import { Request, Response } from 'express';

import { CITIZEN_LOGIN_PASSWORD, CITIZEN_PERSONS, CitizenPerson } from '@config';
import { logger } from '@utils/logger';

/**
 * Mocked BankID auth flow, shaped after https://developers.bankid.com (auth + collect).
 *
 * Real flow to migrate to:
 *   1) POST /auth      -> { orderRef, autoStartToken, qrStartToken }
 *   2) poll /collect   -> pending ... -> complete { completionData.user.personalNumber }
 *   3) resolve personalNumber -> Citizen personId (uuid) via Citizen guid/batch endpoint
 *
 * In this mock the citizen is chosen from a small configured list (CITIZEN_PERSONS),
 * guarded by a shared password (CITIZEN_LOGIN_PASSWORD), so we can verify the
 * Citizen 3.0 lookup end-to-end without a real BankID order.
 */

// How long (ms) the mock pretends the user is still signing before completing.
const MOCK_SIGN_DURATION_MS = 1500;

// orderRef -> the chosen person + when the order started. In-memory; fine for a single-instance POC.
const pendingOrders = new Map<string, { startedAt: number; person: CitizenPerson }>();

/** Short, non-sensitive label for the login picker (first 8 chars of the personId). */
const personLabel = (personId: string) => personId.slice(0, 8);

@Controller()
export class CitizenAuthController {
  /** Lists the selectable mock citizens (truncated personId only — no personnummer). */
  @Get('/citizen/login/options')
  options(@Res() res: Response) {
    return res.json({
      persons: CITIZEN_PERSONS.map((p, index) => ({ index, label: personLabel(p.personId) })),
    });
  }

  @Post('/citizen/login/start')
  start(@Body() body: { personIndex?: number; password?: string }, @Res() res: Response) {
    if (!CITIZEN_LOGIN_PASSWORD) {
      return res.status(401).json({ status: 'failed', hintCode: 'notConfigured' });
    }
    if (body?.password !== CITIZEN_LOGIN_PASSWORD) {
      return res.status(401).json({ status: 'failed', hintCode: 'wrongPassword' });
    }

    const person = typeof body?.personIndex === 'number' ? CITIZEN_PERSONS[body.personIndex] : undefined;
    if (!person) {
      return res.status(400).json({ status: 'failed', hintCode: 'noPerson' });
    }

    const orderRef = randomUUID();
    pendingOrders.set(orderRef, { startedAt: Date.now(), person });

    // autoStartToken/qrStartToken are placeholders so the frontend can render the
    // same UI it will use against real BankID.
    return res.json({
      orderRef,
      autoStartToken: randomUUID(),
      qrStartToken: randomUUID(),
    });
  }

  @Post('/citizen/login/collect')
  collect(@Body() body: { orderRef?: string }, @Req() req: Request, @Res() res: Response) {
    const orderRef = body?.orderRef;
    const order = orderRef ? pendingOrders.get(orderRef) : undefined;

    if (!orderRef || !order) {
      return res.status(400).json({ status: 'failed', hintCode: 'noOrder' });
    }

    if (Date.now() - order.startedAt < MOCK_SIGN_DURATION_MS) {
      return res.json({ orderRef, status: 'pending', hintCode: 'userSign' });
    }

    // Complete: establish the citizen session. The display name is resolved from
    // Citizen 3.0 at /me, so only a placeholder is stored here.
    pendingOrders.delete(orderRef);

    req.session.user = {
      type: 'citizen',
      personId: order.person.personId,
      name: 'Medborgare',
      personNumber: order.person.personNumber,
    };

    logger.info(`Citizen login completed (mock) for personId ${order.person.personId}`);

    return res.json({
      orderRef,
      status: 'complete',
      completionData: { user: { personalNumber: order.person.personNumber } },
    });
  }

  @Post('/citizen/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ status: 'ok' });
    });
    return res;
  }
}
