import { employeeMockBaseUrl, getApiBase, MUNICIPALITY_ID } from '@config';
import ApiService from './api.service';
import ExternalApiService from './external-api.service';
import { PortalPersonData } from '@/data-contracts/employee/data-contracts';

// SAML logins come from the PERSONAL namespace/domain in the fake IdP. The Test-SSO
// handläggare are seeded into the employee mock under the same domain.
const DEFAULT_DOMAIN = 'PERSONAL';

/**
 * Reads employee data. Two backends, chosen by config:
 *  - WSO2 Employee 2.0 (internal gateway, needs a token + VPN):
 *      GET employee/2.0/{municipalityId}/portalpersondata/{domain}/{loginName}
 *  - Standalone employee mock (no token, off-VPN), when EMPLOYEE_MOCK_BASE_URL is set:
 *      GET {base}/api/v1/employee/portalpersondata/{domain}/{loginName}
 */
export class EmployeeService {
  private readonly wso2 = new ApiService();
  private readonly mockBase = employeeMockBaseUrl();
  private readonly mock = this.mockBase ? new ExternalApiService(this.mockBase) : null;

  public async getPortalPersonData(
    loginName: string,
    domain: string = DEFAULT_DOMAIN,
    municipalityId: string = MUNICIPALITY_ID,
  ): Promise<PortalPersonData> {
    if (this.mock) {
      const res = await this.mock.get<PortalPersonData>(`/api/v1/employee/portalpersondata/${domain}/${loginName}`);
      return res.data;
    }
    const url = `${getApiBase('employee')}/${municipalityId}/portalpersondata/${domain}/${loginName}`;
    const res = await this.wso2.get<PortalPersonData>({ url });
    return res.data;
  }
}
