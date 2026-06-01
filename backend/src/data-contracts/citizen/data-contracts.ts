/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the Citizen 3.0 API contract used by this POC.
 * Generate the full file with swagger-typescript-api when more is needed.
 */

export interface CitizenAddress {
  status?: string | null;
  nrDate?: string | null;
  realEstateDescription?: string | null;
  co?: string | null;
  address?: string | null;
  addressArea?: string | null;
  addressNumber?: string | null;
  addressLetter?: string | null;
  appartmentNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  county?: string | null;
  municipality?: string | null;
  country?: string | null;
  emigrated?: boolean | null;
  addressType?: string | null;
  xCoordLocal?: number | null;
  yCoordLocal?: number | null;
}

export interface CitizenExtended {
  /** @format uuid */
  personId?: string;
  givenname?: string | null;
  lastname?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  nrDate?: string | null;
  classified?: string | null;
  protectedNR?: string | null;
  addresses?: CitizenAddress[] | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}
