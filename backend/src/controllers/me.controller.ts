import { Controller, Get, Req, UseBefore } from "routing-controllers";
import { Request } from "express";

import authMiddleware from "@middlewares/auth.middleware";
import { CitizenService } from "@services/citizen.service";
import { EmployeeService } from "@services/employee.service";
import { PortalPersonData } from "@/data-contracts/employee/data-contracts";
import { maskPersonNumber } from "@utils/util";
import { logger } from "@utils/logger";

interface MeResponse {
  type: string;
  name: string;
  maskedPersonNumber?: string;
  // Admin (SAML) fields
  username?: string;
  email?: string;
  groups?: string[];
  // Admin: full employee record from Employee 2.0
  employee?: PortalPersonData | null;
  // Citizen (Citizen 3.0) fields
  citizen: {
    givenname?: string | null;
    lastname?: string | null;
    gender?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    municipality?: string | null;
    realEstateDescription?: string | null;
  } | null;
}

@Controller()
export class MeController {
  private readonly citizenService = new CitizenService();
  private readonly employeeService = new EmployeeService();

  @Get("/me")
  @UseBefore(authMiddleware)
  async getMe(@Req() req: Request): Promise<MeResponse> {
    const user = req.session.user!;

    // Admin: SAML identity + full Employee 2.0 record for the login name.
    if (user.type === "admin") {
      let employee: PortalPersonData | null = null;
      try {
        if (user.username) {
          employee = await this.employeeService.getPortalPersonData(
            user.username,
          );
        }
      } catch (error) {
        logger.error(
          `Could not fetch Employee data for ${user.username}: ${(error as Error).message}`,
        );
      }

      return {
        type: user.type,
        name: employee?.fullname || user.name,
        username: user.username,
        email: employee?.email ?? user.email,
        groups: user.groups,
        maskedPersonNumber: maskPersonNumber(user.citizenIdentifier),
        employee,
        citizen: null,
      };
    }

    // Citizen: fetch Citizen 3.0 data for the logged-in person.
    let citizen: MeResponse["citizen"] = null;
    try {
      const data = await this.citizenService.getCitizen(user.personId!);
      const primaryAddress = data.addresses?.[0];
      citizen = {
        givenname: data.givenname,
        lastname: data.lastname,
        gender: data.gender,
        address: primaryAddress?.address ?? null,
        postalCode: primaryAddress?.postalCode ?? null,
        city: primaryAddress?.city ?? null,
        municipality: primaryAddress?.municipality ?? null,
        realEstateDescription: primaryAddress?.realEstateDescription ?? null,
      };
    } catch (error) {
      // Don't fail the whole dashboard if Citizen is unavailable; log and return null.
      logger.error(
        `Could not fetch Citizen data for personId ${user.personId}: ${(error as Error).message}`,
      );
    }

    return {
      type: user.type,
      name: user.name,
      maskedPersonNumber: maskPersonNumber(user.personNumber),
      citizen,
    };
  }
}
