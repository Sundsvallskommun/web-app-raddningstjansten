import { randomUUID } from 'node:crypto';
import { Body, Controller, Post, Req, Res } from 'routing-controllers';
import { Request, Response } from 'express';

import { CITIZEN_NAME, CITIZEN_PERSON_ID, CITIZEN_PERSON_NUMBER } from '@config';
import { logger } from '@utils/logger';

/**
 * Mocked BankID auth flow, shaped after https://developers.bankid.com (auth + collect).
 *
 * Real flow to migrate to:
 *   1) POST /auth      -> { orderRef, autoStartToken, qrStartToken }
 *   2) poll /collect   -> pending ... -> complete { completionData.user.personalNumber }
 *   3) resolve personalNumber -> Citizen personId (uuid) via Citizen guid/batch endpoint
 *
 * In this mock the personId is taken straight from .env (CITIZEN_PERSON_ID) so we can
 * verify the Citizen 3.0 lookup end-to-end without a real BankID order.
 */

// How long (ms) the mock pretends the user is still signing before completing.
const MOCK_SIGN_DURATION_MS = 1500;

// orderRef -> when the order was started. In-memory; fine for a single-instance POC.
const pendingOrders = new Map<string, number>();

@Controller()
export class CitizenAuthController {
  @Post('/citizen/login/start')
  start(@Res() res: Response) {
    const orderRef = randomUUID();
    pendingOrders.set(orderRef, Date.now());

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
    const startedAt = orderRef ? pendingOrders.get(orderRef) : undefined;

    if (!orderRef || startedAt === undefined) {
      return res.status(400).json({ status: 'failed', hintCode: 'noOrder' });
    }

    if (Date.now() - startedAt < MOCK_SIGN_DURATION_MS) {
      return res.json({ orderRef, status: 'pending', hintCode: 'userSign' });
    }

    // Complete: establish the citizen session.
    pendingOrders.delete(orderRef);

    req.session.user = {
      type: 'citizen',
      personId: CITIZEN_PERSON_ID,
      name: CITIZEN_NAME ?? 'Medborgare',
      personNumber: CITIZEN_PERSON_NUMBER,
    };

    logger.info(`Citizen login completed (mock) for personId ${CITIZEN_PERSON_ID}`);

    return res.json({
      orderRef,
      status: 'complete',
      // Mirrors BankID completionData.user (personalNumber stays server-side after this).
      completionData: {
        user: {
          personalNumber: CITIZEN_PERSON_NUMBER,
          name: CITIZEN_NAME,
        },
      },
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
