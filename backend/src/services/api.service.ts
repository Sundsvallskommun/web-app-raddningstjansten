import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { randomUUID } from 'node:crypto';

import { HttpException } from '@exceptions/HttpException';
import { apiURL } from '@utils/util';
import { logger } from '@utils/logger';
import { createApiTokenService } from './api-token.service';
import { IApiTokenService } from '@interfaces/api-token.interface';

export class ApiResponse<T> {
  data: T;
  message: string;
}

let apiTokenService: IApiTokenService | null = null;

function getApiTokenService(): IApiTokenService {
  if (!apiTokenService) {
    apiTokenService = createApiTokenService();
  }
  return apiTokenService;
}

/**
 * Thin axios wrapper that injects a fresh WSO2 bearer token on every request
 * and normalizes errors into HttpExceptions. All outbound calls go through the
 * gateway base URL via apiURL().
 */
class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create();
    this.instance.interceptors.request.use(
      async request => {
        if (request.url === apiURL('token')) return request;

        const token = await getApiTokenService().getToken();

        const defaultHeaders: Partial<AxiosRequestHeaders> = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': randomUUID(),
        };

        request.headers = AxiosHeaders.from({
          ...defaultHeaders,
          ...request.headers,
        });

        return request;
      },
      error => Promise.reject(error),
    );
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const preparedConfig: AxiosRequestConfig = {
      ...config,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      url: apiURL(config.url),
    };

    try {
      const res = await this.instance(preparedConfig);
      return { data: res.data, message: 'success' };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
        logger.error(`API request 404:ed for url: ${error.response?.config.url}`);
        throw new HttpException(404, 'Not found');
      } else if (axios.isAxiosError(error) && (error as AxiosError).response?.data) {
        const data = error.response?.data as { detail?: string; title?: string; violations?: string[] };
        logger.error(`API request failed with status ${error.response?.status} for ${error.response?.config.url}`);
        throw new HttpException(
          error.response?.status ?? 500,
          data?.detail ?? data?.title ?? 'Internal server error',
          data?.violations,
        );
      } else {
        logger.error(`Unknown error: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw new HttpException(500, 'Internal server error');
    }
  }

  public async get<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET' });
  }

  public async post<T, D>(config: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST' });
  }

  public async patch<T, D>(config: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH' });
  }

  public async put<T, D>(config: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT' });
  }

  public async delete<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' });
  }
}

export default ApiService;
