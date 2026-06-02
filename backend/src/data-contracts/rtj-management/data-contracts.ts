/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the rtj-management (Errand) API contract used by this POC.
 */

export interface ContactChannel {
  key?: string; // e.g. "Email", "Phone"
  value?: string;
}

export interface Stakeholder {
  id?: string;
  externalId?: string;
  externalIdType?: string; // "PERSON" | "ORGANIZATION"
  role?: string; // e.g. "APPLICANT"
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  address?: string;
  careOf?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  contactChannels?: ContactChannel[];
}

export interface Errand {
  id?: string;
  municipalityId?: string;
  namespace?: string;
  errandNumber?: string;
  typeSlug?: string;
  title?: string;
  status?: string;
  description?: string;
  priority?: string;
  reporterUserId?: string;
  assignedUserId?: string;
  applicantEmail?: string;
  processDefinitionName?: string;
  processInstanceId?: string;
  created?: string;
  modified?: string;
  touched?: string;
}

export interface PagingAndSortingMetaData {
  page?: number;
  limit?: number;
  count?: number;
  totalRecords?: number;
  totalPages?: number;
  sortBy?: string[];
  sortDirection?: 'ASC' | 'DESC';
}

export interface FindErrandsResponse {
  errands?: Errand[];
  _meta?: PagingAndSortingMetaData;
}
