/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the LegalEntity 2.0 API contract used by this POC.
 * Mirrors web-app-mina-sidor-bolag.
 */

export interface EngagementRole {
  description?: string | null;
  code?: string | null;
}

export interface PersonEngagement {
  organizationNumber?: string | null;
  name?: string | null;
  form?: string | null;
  formShort?: string | null;
  roles?: EngagementRole[] | null;
  /** True when the person is an authorized signatory (firmatecknare). */
  isAuthorizedSignatory?: boolean | null;
  /** True when the person is a sole trader (enskild näringsidkare). */
  isSoleTrader?: boolean | null;
  source?: string | null;
}
