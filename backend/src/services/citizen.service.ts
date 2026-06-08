import { getApiBase, MUNICIPALITY_ID } from '@config';
import ApiService from './api.service';
import { CitizenExtended } from '@/data-contracts/citizen/data-contracts';

/**
 * Reads a single citizen from Citizen 3.0 via the WSO2 gateway.
 * GET citizen/3.0/{municipalityId}/{personId}
 */
export class CitizenService {
  private readonly apiService = new ApiService();

  public async getCitizen(personId: string, municipalityId: string = MUNICIPALITY_ID): Promise<CitizenExtended> {
    const url = `${getApiBase('citizen')}/${municipalityId}/${personId}`;
    const res = await this.apiService.get<CitizenExtended>({ url });
    return res.data;
  }

  /**
   * Resolves a personId (guid) from a Swedish personal number.
   * GET citizen/3.0/{municipalityId}/{personNumber}/guid
   *
   * Used by the OneGate SAML login to map the BankID personnummer (from the SAML
   * assertion) to the Citizen personId the rest of the app keys on.
   */
  public async getPersonId(personNumber: string, municipalityId: string = MUNICIPALITY_ID): Promise<string> {
    const url = `${getApiBase('citizen')}/${municipalityId}/${personNumber}/guid`;
    const res = await this.apiService.get<string>({ url });
    return typeof res.data === 'string' ? res.data : String(res.data ?? '');
  }
}
