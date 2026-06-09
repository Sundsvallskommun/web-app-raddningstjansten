import type { Errand } from "@/api/api-service";

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

const withinDateRange = (created: string | undefined, fromStr: string, toStr: string): boolean => {
  if (!fromStr && !toStr) return true;
  if (!created) return false;
  const t = new Date(created).getTime();
  if (Number.isNaN(t)) return false;
  if (fromStr && t < new Date(`${fromStr}T00:00:00`).getTime()) return false;
  if (toStr && t > new Date(`${toStr}T23:59:59.999`).getTime()) return false;
  return true;
};

/**
 * Client-side filtering of an errand list by title, status, applicant email and
 * submission-date range. Client-side because the errand API currently 500s on any
 * non-ASCII character (å/ä/ö) in its `filter`/`q` params, so server-side text
 * search is unreliable; status/date are matched here too for one uniform path.
 */
export function applyErrandFilters<T extends Errand>(
  errands: T[],
  f: ErrandFilterState,
  audience: Audience,
): T[] {
  const title = f.title.trim().toLowerCase();
  const applicant = f.applicant.trim().toLowerCase();
  const opt = f.status ? statusOptions(audience).find(o => o.value === f.status) : undefined;
  const statusSet = opt ? new Set(opt.statuses) : null;

  return errands.filter(e => {
    if (title && !(e.title ?? "").toLowerCase().includes(title)) return false;
    if (applicant && !(e.applicantEmail ?? "").toLowerCase().includes(applicant)) return false;
    if (statusSet && !(e.status && statusSet.has(e.status))) return false;
    if (!withinDateRange(e.created, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}
