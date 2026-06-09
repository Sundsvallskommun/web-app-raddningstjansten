import axios from 'axios';

/** HTTP status of a failed request, if it had a response. */
export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * The most useful human-readable message for a failed request: the BFF's response
 * body message (message/detail/title) when present, otherwise the given fallback.
 * Avoids surfacing axios's generic "Request failed with status code 400" — the
 * real reason from the API (e.g. "Fastigheten ligger i fel område …") is what the
 * user needs to see.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object') {
      const body = data as { message?: string; detail?: string; title?: string };
      const fromBody = body.message ?? body.detail ?? body.title;
      if (fromBody && fromBody.trim()) return fromBody.trim();
    }
  }
  return fallback;
}

// Gateway/proxy statuses that mean "the backend is up but its upstream isn't".
const UPSTREAM_STATUSES = new Set([502, 503, 504]);

/**
 * True when the failure is a transient availability problem — a bad-gateway
 * family status from the BFF/proxy, or no response at all (network/unreachable).
 * These are worth retrying and warrant a "try again shortly" message rather than
 * a hard error.
 */
export function isUpstreamUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === undefined) return true; // no response: network error / unreachable
  return UPSTREAM_STATUSES.has(status);
}

/** React Query retry predicate: only retry transient upstream failures (max 3). */
export function retryUpstream(failureCount: number, error: unknown): boolean {
  return isUpstreamUnavailable(error) && failureCount < 3;
}

/** Exponential backoff capped at 8s: 1s, 2s, 4s. */
export const retryBackoff = (attempt: number): number => Math.min(1000 * 2 ** attempt, 8000);
