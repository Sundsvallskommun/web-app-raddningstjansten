export type Audience = "citizen" | "admin";

export interface ErrandFilterState {
  title: string;
  status: string; // status-option value; '' = all
  applicant: string; // applicant email substring
  dateFrom: string; // 'YYYY-MM-DD'
  dateTo: string; // 'YYYY-MM-DD'
}

export const emptyErrandFilters: ErrandFilterState = {
  title: "",
  status: "",
  applicant: "",
  dateFrom: "",
  dateTo: "",
};

export const hasActiveFilters = (f: ErrandFilterState): boolean =>
  Boolean(f.title || f.status || f.applicant || f.dateFrom || f.dateTo);

/** A status dropdown option that maps a friendly label to one or more raw statuses. */
export interface StatusOption {
  value: string;
  label: string;
  statuses: string[];
}

/**
 * Status options per audience. Citizens never see "manuell granskning" as its own
 * state — it is folded into "Pågående" (same as the chip remap).
 */
export function statusOptions(audience: Audience): StatusOption[] {
  if (audience === "citizen") {
    return [
      { value: "REGISTERED", label: "Inskickad", statuses: ["REGISTERED", "NEW"] },
      { value: "ONGOING", label: "Pågående", statuses: ["ONGOING", "UNDER_MANUAL_REVIEW"] },
      { value: "AWAITING_SUPPLEMENTATION", label: "Väntar på komplettering", statuses: ["AWAITING_SUPPLEMENTATION"] },
      { value: "DECIDED", label: "Beslutad", statuses: ["DECIDED", "APPROVED"] },
      { value: "REJECTED", label: "Avslagen", statuses: ["REJECTED"] },
    ];
  }
  return [
    { value: "REGISTERED", label: "Inskickad", statuses: ["REGISTERED", "NEW"] },
    { value: "UNDER_MANUAL_REVIEW", label: "Behandlas / Ny", statuses: ["UNDER_MANUAL_REVIEW"] },
    { value: "ONGOING", label: "Pågående", statuses: ["ONGOING"] },
    { value: "AWAITING_SUPPLEMENTATION", label: "Väntar på komplettering", statuses: ["AWAITING_SUPPLEMENTATION"] },
    { value: "DECIDED", label: "Beslutad", statuses: ["DECIDED", "APPROVED"] },
    { value: "REJECTED", label: "Avslagen", statuses: ["REJECTED"] },
  ];
}

/** Query params sent to the BFF, which builds the server-side (rtj) filter. */
export interface ErrandQueryParams {
  status?: string; // CSV of raw statuses
  title?: string;
  applicant?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

/**
 * Convert the filter bar's state into BFF query params. The status option is
 * resolved here to its raw statuses (audience-specific grouping stays on the
 * client). Sent via axios `params`, i.e. UTF-8 (encodeURIComponent) — never
 * Latin-1/escape(), which is what made the errand API 500 on å/ä/ö.
 */
export function toErrandQueryParams(f: ErrandFilterState, audience: Audience): ErrandQueryParams {
  const opt = f.status ? statusOptions(audience).find(o => o.value === f.status) : undefined;
  const params: ErrandQueryParams = {};
  if (f.title.trim()) params.title = f.title.trim();
  if (f.applicant.trim()) params.applicant = f.applicant.trim();
  if (opt) params.status = opt.statuses.join(",");
  if (f.dateFrom) params.from = f.dateFrom;
  if (f.dateTo) params.to = f.dateTo;
  return params;
}
