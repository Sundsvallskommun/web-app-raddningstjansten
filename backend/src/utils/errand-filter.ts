/**
 * Builds a spring-filter (turkraft) expression for the rtj-management errands
 * endpoint from the structured query the UI sends. Values are sanitised so a
 * search string can never break out of the single-quoted string literal.
 *
 * Notes on the rtj syntax (verified live):
 *   equality  field : 'v'      like  field ~ '*v*'      compare  created >= 'iso'
 *   logical   a and b, a or b, parentheses             ('in (...)' is NOT supported)
 */

/** Strip the two characters that could break a single-quoted literal. */
const sanitize = (v: string): string => v.replace(/['\\]/g, '').trim();

const isYmd = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isStatus = (v: string): boolean => /^[A-Z_]+$/.test(v);

/** Split a comma-separated status param into clean raw statuses. */
export function parseStatuses(csv?: string): string[] {
  return (csv ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(isStatus);
}

export interface ErrandFilterInput {
  /** Raw statuses (already mapped from the UI's status option). OR-combined. */
  statuses?: string[];
  title?: string;
  /** Applicant email substring. */
  applicant?: string;
  from?: string; // YYYY-MM-DD (inclusive, start of day UTC)
  to?: string; // YYYY-MM-DD (inclusive, end of day UTC)
  typeSlug?: string;
  /** Restricts the list to one reporter — used to scope a citizen to their own. */
  reporterUserId?: string;
}

/** Assemble the AND-combined filter expression, or undefined if nothing to filter. */
export function buildErrandFilter(input: ErrandFilterInput): string | undefined {
  const clauses: string[] = [];

  if (input.reporterUserId) clauses.push(`reporterUserId : '${sanitize(input.reporterUserId)}'`);
  if (input.typeSlug) clauses.push(`typeSlug : '${sanitize(input.typeSlug)}'`);

  const title = input.title ? sanitize(input.title) : '';
  if (title) clauses.push(`title ~ '*${title}*'`);

  const applicant = input.applicant ? sanitize(input.applicant) : '';
  if (applicant) clauses.push(`applicantEmail ~ '*${applicant}*'`);

  const statuses = (input.statuses ?? []).filter(isStatus);
  if (statuses.length === 1) clauses.push(`status : '${statuses[0]}'`);
  else if (statuses.length > 1) clauses.push(`(${statuses.map(s => `status : '${s}'`).join(' or ')})`);

  if (input.from && isYmd(input.from)) clauses.push(`created >= '${input.from}T00:00:00.000Z'`);
  if (input.to && isYmd(input.to)) clauses.push(`created <= '${input.to}T23:59:59.999Z'`);

  return clauses.length ? clauses.join(' and ') : undefined;
}
