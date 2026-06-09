import { citizenMockBaseUrl, getApiBase, MUNICIPALITY_ID } from '@config';
import ApiService from './api.service';
import ExternalApiService from './external-api.service';
import { CitizenExtended } from '@/data-contracts/citizen/data-contracts';

/**
 * Reads citizens. Two backends, chosen by config:
 *  - WSO2 Citizen 3.0 (internal gateway, needs a token + VPN):
 *      GET citizen/3.0/{municipalityId}/{personId}
 *  - Standalone citizen mock (no token, off-VPN), when CITIZEN_MOCK_BASE_URL is set:
 *      GET {base}/api/v2/citizen/{personId}
 * Both return the same CitizenExtended shape, so callers are unaffected.
 */
export class CitizenService {
  private readonly wso2 = new ApiService();
  private readonly mockBase = citizenMockBaseUrl();
  private readonly mock = this.mockBase ? new ExternalApiService(this.mockBase) : null;

  public async getCitizen(personId: string, municipalityId: string = MUNICIPALITY_ID): Promise<CitizenExtended> {
    if (this.mock) {
      const res = await this.mock.get<CitizenExtended>(`/api/v2/citizen/${personId}`);
      return res.data;
    }
    const url = `${getApiBase('citizen')}/${municipalityId}/${personId}`;
    const res = await this.wso2.get<CitizenExtended>({ url });
    return res.data;
  }

  /** Resolves a personId (guid) from a Swedish personal number. */
  public async getPersonId(personNumber: string, municipalityId: string = MUNICIPALITY_ID): Promise<string> {
    if (this.mock) {
      const res = await this.mock.get<string>(`/api/v2/citizen/${personNumber}/guid`, { params: { municipalityId } });
      return typeof res.data === 'string' ? res.data : String(res.data ?? '');
    }
    const url = `${getApiBase('citizen')}/${municipalityId}/${personNumber}/guid`;
    const res = await this.wso2.get<string>({ url });
    return typeof res.data === 'string' ? res.data : String(res.data ?? '');
  }
}
