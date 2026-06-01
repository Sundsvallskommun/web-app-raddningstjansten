// Subscribed APIs (lowercased names matching the WSO2 gateway base path).
// `gateway` selects which base URL to use: external (API_BASE_URL, e.g. Citizen)
// or internal (EMPLOYEE_API_BASE_URL, e.g. Employee).
export const APIS = [
  {
    name: 'citizen',
    version: '3.0',
    gateway: 'external',
  },
  {
    name: 'employee',
    version: '2.0',
    gateway: 'internal',
  },
] as const;

type ApiName = (typeof APIS)[number]['name'];

/** Relative base path for an API, e.g. "employee/2.0". */
export const getApiBase = (name: ApiName) => {
  const api = APIS.find(api => api.name === name);
  return `${api?.name}/${api?.version}`;
};

/**
 * Absolute gateway base URL for an API. Read lazily from process.env so it
 * picks up dotenv-loaded values regardless of module evaluation order.
 */
export const getApiBaseUrl = (name: ApiName): string => {
  const api = APIS.find(api => api.name === name);
  const external = process.env.API_BASE_URL ?? '';
  const internal = process.env.EMPLOYEE_API_BASE_URL || external;
  return api?.gateway === 'internal' ? internal : external;
};
