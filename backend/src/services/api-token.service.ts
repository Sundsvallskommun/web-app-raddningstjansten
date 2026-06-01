import { MemoryApiTokenService } from './api-token-service/memory-api-token.service';
import { IApiTokenService } from '@interfaces/api-token.interface';

export function createApiTokenService(): IApiTokenService {
  // POC: single-instance, in-memory cache. Add a Redis variant here later.
  return new MemoryApiTokenService();
}
