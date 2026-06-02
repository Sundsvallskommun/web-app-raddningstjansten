const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** True when the string is a canonical UUID (errand ids). */
export const isUuid = (s?: string): boolean => !!s && UUID_RE.test(s);
