/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the Templating API contract — v2.1 (rendering only).
 */

export interface RenderRequest {
  identifier?: string;
  version?: string;
  /** Template parameters. May contain nested objects/arrays/booleans. */
  parameters?: Record<string, unknown>;
}

export interface RenderResponse {
  /** Rendered output, as a BASE64-encoded string (HTML for /render, PDF for /render/pdf). */
  output?: string;
}
