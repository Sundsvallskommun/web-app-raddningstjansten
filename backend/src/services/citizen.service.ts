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
}
