import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'node:crypto';

import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';

export interface ExternalResponse<T> {
  data: T;
  status: number;
  location?: string;
  contentType?: string;
  contentDisposition?: string;
}

/**
 * Axios wrapper for talking DIRECTLY to a service that is NOT behind WSO2
 * (e.g. rtj-management in Dokploy). Never attaches a Bearer token. Supports
 * JSON, multipart uploads (pass a form-data instance + its headers) and binary
 * downloads (pass responseType: 'arraybuffer').
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
      // Don't force Content-Type: axios sets application/json for plain objects
      // and multipart (with boundary) when a form-data instance is passed.
      if (!request.headers.get('Accept')) request.headers.set('Accept', 'application/json');
      request.headers.set('X-Request-Id', randomUUID());
      return request;
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ExternalResponse<T>> {
    try {
      const res = await this.instance(config);
      const headers = res.headers ?? {};
      return {
        data: res.data,
        status: res.status,
        location: (headers.location as string) ?? undefined,
        contentType: (headers['content-type'] as string) ?? undefined,
        contentDisposition: (headers['content-disposition'] as string) ?? undefined,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ detail?: string; title?: string }>;
        const status = err.response?.status ?? 500;
        const data = err.response?.data;
        const message =
          (typeof data === 'object' && (data?.detail ?? data?.title)) || err.message;
        const rawBody = typeof data === 'string' ? data : JSON.stringify(data ?? {});
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

  public put<T, D = unknown>(url: string, data?: D, config: AxiosRequestConfig = {}): Promise<ExternalResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }
}

export default ExternalApiService;
