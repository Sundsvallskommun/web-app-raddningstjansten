import { Controller, Get, Req, UseBefore } from 'routing-controllers';
import { Request } from 'express';

import authMiddleware from '@middlewares/auth.middleware';
import { CitizenService } from '@services/citizen.service';
import { maskPersonNumber } from '@utils/util';
import { logger } from '@utils/logger';

interface MeResponse {
  type: string;
  name: string;
  maskedPersonNumber?: string;
  // Admin (SAML) fields
  username?: string;
  email?: string;
  groups?: string[];
  // Citizen (Citizen 3.0) fields
  citizen: {
    givenname?: string | null;
    lastname?: string | null;
    gender?: string | null;
    city?: string | null;
    municipality?: string | null;
  } | null;
}

@Controller()
export class MeController {
  private readonly citizenService = new CitizenService();

  @Get('/me')
  @UseBefore(authMiddleware)
  async getMe(@Req() req: Request): Promise<MeResponse> {
    const user = req.session.user!;

    // Admin: show the SAML profile directly (no Citizen lookup).
    if (user.type === 'admin') {
      return {
        type: user.type,
        name: user.name,
        username: user.username,
        email: user.email,
        groups: user.groups,
        maskedPersonNumber: maskPersonNumber(user.citizenIdentifier),
        citizen: null,
      };
    }

    // Citizen: fetch Citizen 3.0 data for the logged-in person.
    let citizen: MeResponse['citizen'] = null;
    try {
      const data = await this.citizenService.getCitizen(user.personId!);
      const primaryAddress = data.addresses?.[0];
      citizen = {
        givenname: data.givenname,
        lastname: data.lastname,
        gender: data.gender,
        city: primaryAddress?.city ?? null,
        municipality: primaryAddress?.municipality ?? null,
      };
    } catch (error) {
      // Don't fail the whole dashboard if Citizen is unavailable; log and return null.
      logger.error(`Could not fetch Citizen data for personId ${user.personId}: ${(error as Error).message}`);
    }

    return {
      type: user.type,
      name: user.name,
      maskedPersonNumber: maskPersonNumber(user.personNumber),
      citizen,
    };
  }
}
