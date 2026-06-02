import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'node:crypto';

import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';

export interface ExternalResponse<T> {
  data: T;
  status: number;
  location?: string;
}

/**
 * Axios wrapper for talking DIRECTLY to a service that is NOT behind WSO2
 * (e.g. rtj-management in Dokploy). Unlike ApiService it never attaches a
 * Bearer token. Pass a full base URL in the constructor; service methods pass
 * the path relative to it.
 */
class ExternalApiService {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    this.instance.interceptors.request.use(request => {
      request.headers.set('Content-Type', 'application/json');
      request.headers.set('Accept', 'application/json');
      request.headers.set('X-Request-Id', randomUUID());
      return request;
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ExternalResponse<T>> {
    try {
      const res = await this.instance(config);
      const location = (res.headers?.location as string) ?? undefined;
      return { data: res.data, status: res.status, location };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ detail?: string; title?: string }>;
        const status = err.response?.status ?? 500;
        const message = err.response?.data?.detail ?? err.response?.data?.title ?? err.message;
        // Log the full upstream response body to make the root cause unmistakable.
        const rawBody =
          typeof err.response?.data === 'string'
            ? err.response?.data
            : JSON.stringify(err.response?.data ?? {});
        logger.error(
          `External API ${config.method} ${config.url} failed: ${status} ${message} | body=${rawBody}`,
        );
        throw new HttpException(status === 404 ? 404 : status, message || 'External API error');
      }
      logger.error(`External API unknown error: ${(error as Error).stack ?? (error as Error).message}`);
      throw new HttpException(500, 'External API error');
    }
  }

  public get<T>(url: string, config: AxiosRequestConfig = {}): Promise<ExternalResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  public post<T, D = unknown>(url: string, data: D, config: AxiosRequestConfig = {}): Promise<ExternalResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }
}

export default ExternalApiService;
