/**
 * Client-side "updated since last seen" tracking for errand badges.
 * Stores errandId -> last-seen `modified` timestamp in localStorage. The
 * rtj-management notifications API does not surface per-citizen updates, so we
 * derive "something changed" from the errand's own `modified` timestamp.
 */

const KEY = 'rtj.seenErrands';

type SeenMap = Record<string, string>;

function read(): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function write(map: SeenMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** True when the errand's `modified` is newer than what the user last saw. */
export function isUpdated(id?: string, modified?: string): boolean {
  if (!id || !modified) return false;
  const seen = read()[id];
  return seen ? modified > seen : false;
}

/**
 * Record a baseline for errands the user hasn't seen before, so brand-new
 * errands don't show as "updated". Existing entries are left untouched.
 */
export function baselineSeen(errands: { id?: string; modified?: string }[]): void {
  const map = read();
  let changed = false;
  for (const e of errands) {
    if (e.id && e.modified && !map[e.id]) {
      map[e.id] = e.modified;
      changed = true;
    }
  }
  if (changed) write(map);
}

/** Mark an errand as seen at its current `modified` (clears its badge). */
export function markSeen(id?: string, modified?: string): void {
  if (!id || !modified) return;
  const map = read();
  map[id] = modified;
  write(map);
}
