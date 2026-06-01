// Subscribed APIs (lowercased names matching the WSO2 gateway base path)
export const APIS = [
  {
    name: 'citizen',
    version: '3.0',
  },
] as const;

type ApiName = (typeof APIS)[number]['name'];

export const getApiBase = (name: ApiName) => {
  const api = APIS.find(api => api.name === name);
  return `${api?.name}/${api?.version}`;
};
