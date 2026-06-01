import { getApiBase, MUNICIPALITY_ID } from '@config';
import ApiService from './api.service';
import { PortalPersonData } from '@/data-contracts/employee/data-contracts';

// SAML logins come from the PERSONAL namespace/domain in the fake IdP.
const DEFAULT_DOMAIN = 'PERSONAL';

/**
 * Reads employee data from Employee 2.0 (internal WSO2 gateway).
 * GET employee/2.0/{municipalityId}/portalpersondata/{domain}/{loginName}
 */
export class EmployeeService {
  private readonly apiService = new ApiService();

  public async getPortalPersonData(
    loginName: string,
    domain: string = DEFAULT_DOMAIN,
    municipalityId: string = MUNICIPALITY_ID,
  ): Promise<PortalPersonData> {
    const url = `${getApiBase('employee')}/${municipalityId}/portalpersondata/${domain}/${loginName}`;
    const res = await this.apiService.get<PortalPersonData>({ url });
    return res.data;
  }
}
