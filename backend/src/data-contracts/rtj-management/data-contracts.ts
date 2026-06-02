/* eslint-disable */
/* tslint:disable */
/*
 * Subset of the rtj-management (Egensotning) API contract — v2.2.
 */

export interface ContactChannel {
  key?: string; // "Email", "Phone"
  value?: string;
}

export interface Stakeholder {
  id?: string;
  externalId?: string;
  externalIdType?: string;
  role?: string;
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

export interface Attachment {
  id?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  created?: string;
  modified?: string;
}

/** One sotningsobjekt (eldstad/anläggning) in an egensotning application. */
export interface Sotningsobjekt {
  id?: string;
  typ?: string; // required on submit
  fabrikat?: string;
  tillverkningsar?: number;
  bransleslag?: string;
  branslemangd?: string;
  sotningsintervallVeckor?: number;
  created?: string;
  modified?: string;
}

/** JSON `application` part of the single-call submission. */
export interface EgensotningApplication {
  applicantEmail: string;
  personnummer: string;
  fastighetsbeteckning: string;
  sotningsobjekt: Sotningsobjekt[];
  propertyAddress?: string;
  applicantFirstName?: string;
  applicantLastName?: string;
  applicantAddress?: string;
  applicantZipCode?: string;
  applicantCity?: string;
  applicantCountry?: string;
  applicantPhone?: string;
  title?: string;
  description?: string;
  priority?: string;
  reporterUserId?: string;
  assignedUserId?: string;
}

/** Verification/decision-support details for an egensotning errand (read-only). */
export interface EgensotningDetails {
  personnummer?: string;
  fastighetsbeteckning?: string;
  propertyAddress?: string;
  bilagaPresent?: boolean;
  registeredAtProperty?: boolean;
  reapplicationOk?: boolean;
  lastOutcome?: string; // AUTO_APPROVE | NEEDS_MANUAL_REVIEW | NEEDS_SUPPLEMENT
  manualReviewReason?: string; // NOT_REGISTERED | REAPPLICATION_REJECTED | REAPPLICATION_ONGOING
  lastVerifiedAt?: string;
  created?: string;
  modified?: string;
}

export interface Decision {
  id?: string;
  decisionType?: string;
  value?: string;
  description?: string;
  createdBy?: string;
  created?: string;
}

export interface StatusHistoryEntry {
  id?: string;
  errandId?: string;
  fromStatus?: string;
  toStatus?: string;
  changedBy?: string;
  changedAt?: string;
}

export interface Notification {
  id?: string;
  errandId?: string;
  ownerId?: string;
  createdBy?: string;
  type?: 'CREATE' | 'UPDATE' | 'DELETE';
  subType?: string;
  description?: string;
  content?: string;
  acknowledged?: boolean;
  expires?: string;
  created?: string;
  modified?: string;
}

export interface ProcessMessageRequest {
  messageName: string;
  variables?: Record<string, unknown>;
}
