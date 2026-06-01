import { logger } from '@utils/logger';
import { IApiTokenService } from '@interfaces/api-token.interface';
import { fetchApiToken } from '@utils/fetchToken';

export interface Token {
  access_token: string;
  expires_in: number;
}

let c_access_token = '';
let c_token_expires = 0;

/**
 * In-memory token cache. Good enough for a single-instance POC.
 * Swap for a Redis-backed implementation when scaling out.
 */
export class MemoryApiTokenService implements IApiTokenService {
  public async getToken(): Promise<string> {
    if (Date.now() >= c_token_expires) {
      logger.info('[MEMORY] Getting oauth API token');
      await this.fetchToken();
    }
    return c_access_token;
  }

  private setToken(token: Token) {
    c_access_token = token.access_token;
    // Refresh 10s before actual expiry to avoid edge-of-expiry failures.
    c_token_expires = Date.now() + (token.expires_in * 1000 - 10000);
  }

  private async fetchToken(): Promise<void> {
    const token = await fetchApiToken();
    this.setToken(token);
  }
}
