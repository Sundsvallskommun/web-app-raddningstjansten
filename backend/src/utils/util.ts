import { API_BASE_URL } from '@config';

/**
 * @description checks if a value is empty (null, '', undefined, or empty object)
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true;
  } else if (typeof value !== 'number' && value === '') {
    return true;
  } else if (typeof value === 'undefined' || value === undefined) {
    return true;
  } else if (value !== null && typeof value === 'object' && !Object.keys(value).length) {
    return true;
  } else {
    return false;
  }
};

/**
 * Build a full URL against the WSO2 API base, trimming slashes between parts.
 */
export const apiURL = (...parts: string[]): string => {
  const urlParts = [API_BASE_URL, ...parts];
  return urlParts.map(pathPart => pathPart.replace(/(^\/|\/$)/g, '')).join('/');
};

/**
 * Mask a Swedish personal number so it never leaves the BFF in clear text.
 * Keeps the birth date, hides the last four digits: "199001011234" -> "19900101-XXXX".
 * Accepts 10- or 12-digit input with or without separators.
 */
export const maskPersonNumber = (personNumber?: string | null): string | undefined => {
  if (!personNumber) return undefined;
  const digits = personNumber.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXXXX-XXXX';
  const datePart = digits.slice(0, digits.length - 4);
  return `${datePart}-XXXX`;
};

/**
 * Mask a personal number embedded at the end of an id, e.g. a reporterUserId
 * "medborgare-198305090014" -> "medborgare-19830509-XXXX". Ids without a
 * trailing 10–12 digit number are returned unchanged.
 */
export const maskReporterUserId = (id?: string | null): string | undefined => {
  if (!id) return id ?? undefined;
  const match = id.match(/^(.*?)(\d{10,12})$/);
  return match ? `${match[1]}${maskPersonNumber(match[2])}` : id;
};
