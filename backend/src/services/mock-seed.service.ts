import {
  citizenMockBaseUrl,
  citizenMockEnabled,
  employeeMockBaseUrl,
  employeeMockEnabled,
  mockCitizens,
  MUNICIPALITY_ID,
  testHandlaggare,
} from '@config';
import ExternalApiService from './external-api.service';
import { logger } from '@utils/logger';

// The Test-SSO handläggare are seeded under this employee-mock domain; it must
// match EmployeeService's lookup domain.
const EMPLOYEE_DOMAIN = 'PERSONAL';

/**
 * Seed the standalone citizen + employee mocks with the POC test data at startup.
 * Idempotent (check-before-create) and best-effort — a missing/slow mock is logged
 * and never blocks boot. No-op for a mock that isn't configured.
 */
export const seedMocks = async (): Promise<void> => {
  await seedCitizens();
  await seedEmployees();
};

async function seedCitizens(): Promise<void> {
  if (!citizenMockEnabled()) return;
  const api = new ExternalApiService(citizenMockBaseUrl());
  const citizens = mockCitizens();
  let created = 0;
  for (const c of citizens) {
    try {
      const existing = await api
        .get<string>(`/api/v2/citizen/${c.personNumber}/guid`, { params: { municipalityId: MUNICIPALITY_ID } })
        .then(r => (typeof r.data === 'string' ? r.data : ''))
        .catch(() => '');
      if (existing) continue;
      await api.post(`/api/v2/citizen`, {
        personalNumber: c.personNumber,
        givenname: c.givenname,
        lastname: c.lastname,
        gender: c.gender,
        addresses: [
          {
            realEstateDescription: c.realEstateDescription,
            address: c.address,
            postalCode: c.postalCode,
            city: c.city,
            municipality: MUNICIPALITY_ID,
            addressType: 'POPULATION_REGISTRATION_ADDRESS',
          },
        ],
      });
      created++;
    } catch (e) {
      logger.warn(`Citizen mock seed for ${c.givenname} ${c.lastname} failed: ${(e as Error).message}`);
    }
  }
  logger.info(`Citizen mock seeded (${created} created, ${citizens.length} configured)`);
}

async function seedEmployees(): Promise<void> {
  if (!employeeMockEnabled()) return;
  const api = new ExternalApiService(employeeMockBaseUrl());
  // Only seed handläggare that have a personnummer (the mock requires it).
  const handlaggare = testHandlaggare().filter(h => h.personNumber);
  let created = 0;
  for (const h of handlaggare) {
    try {
      const existing = await api
        .get(`/api/v1/employee/portalpersondata/${EMPLOYEE_DOMAIN}/${h.loginName}`)
        .then(() => true)
        .catch(() => false);
      if (existing) continue;
      await api.post(`/api/v1/employee`, {
        personNumber: h.personNumber,
        givenname: h.givenname,
        lastname: h.lastname,
        domain: EMPLOYEE_DOMAIN,
        loginName: h.loginName,
        email: h.email,
        manager: h.groups.some(g => /CHEFER/i.test(g)),
      });
      created++;
    } catch (e) {
      logger.warn(`Employee mock seed for ${h.loginName} failed: ${(e as Error).message}`);
    }
  }
  logger.info(`Employee mock seeded (${created} created, ${handlaggare.length} configured)`);
}
