/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the Employee 2.0 API contract used by this POC.
 */

export interface PortalPersonData {
  /** @format uuid */
  personid?: string;
  givenname?: string | null;
  lastname?: string | null;
  fullname?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  workPhone?: string | null;
  mobilePhone?: string | null;
  extraMobilePhone?: string | null;
  aboutMe?: string | null;
  email?: string | null;
  mailNickname?: string | null;
  company?: string | null;
  companyId?: number;
  orgTree?: string | null;
  referenceNumber?: string | null;
  isManager?: boolean;
  loginName?: string | null;
  fullOrgTree?: string | null;
}

export interface Account {
  /** @format uuid */
  personId?: string;
  loginName?: string | null;
  domain?: string | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}
