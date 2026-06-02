import { getApiBase, MUNICIPALITY_ID } from '@config';
import ApiService from './api.service';
import { PersonEngagement } from '@/data-contracts/legalentity/data-contracts';

/**
 * Reads a person's company engagements from LegalEntity 2.0 (via WSO2).
 * Used to tell whether the citizen is an authorized signatory (firmatecknare)
 * or a sole trader (enskild näringsidkare).
 * GET legalentity/2.0/{municipalityId}/engagements/person/{personNumber}
 */
export class EngagementService {
  private readonly apiService = new ApiService();

  public async getEngagements(personNumber: string): Promise<PersonEngagement[]> {
    const url = `${getApiBase('legalentity')}/${MUNICIPALITY_ID}/engagements/person/${personNumber}`;
    const res = await this.apiService.get<PersonEngagement[]>({ url });
    return res.data ?? [];
  }
}
