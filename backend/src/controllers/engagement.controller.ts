import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { Request } from 'express';

import authMiddleware from '@middlewares/auth.middleware';
import { HttpException } from '@exceptions/HttpException';
import { EngagementService } from '@services/engagement.service';
import { logger } from '@utils/logger';

interface EngagementDto {
  organizationNumber: string;
  name: string;
  isAuthorizedSignatory: boolean;
  isSoleTrader: boolean;
}

@Controller()
export class EngagementController {
  private readonly engagementService = new EngagementService();

  /**
   * Company engagements where the logged-in citizen can act for the company
   * (authorized signatory or sole trader) — used to pick private vs company
   * when submitting an errand.
   */
  @Get('/citizen/engagements')
  @UseBefore(authMiddleware)
  async getEngagements(@Req() req: Request): Promise<EngagementDto[]> {
    const user = req.session.user!;
    if (user.type !== 'citizen' || !user.personNumber) {
      throw new HttpException(403, 'FORBIDDEN');
    }

    try {
      const engagements = await this.engagementService.getEngagements(user.personNumber);
      return engagements
        .filter(e => e.isAuthorizedSignatory || e.isSoleTrader)
        .filter(e => e.organizationNumber)
        .map(e => ({
          organizationNumber: e.organizationNumber!,
          name: e.name ?? e.organizationNumber!,
          isAuthorizedSignatory: !!e.isAuthorizedSignatory,
          isSoleTrader: !!e.isSoleTrader,
        }));
    } catch (error) {
      // Don't block the form if LegalEntity is unavailable; just offer "private".
      logger.error(`Could not fetch engagements for ${user.personNumber}: ${(error as Error).message}`);
      return [];
    }
  }
}
