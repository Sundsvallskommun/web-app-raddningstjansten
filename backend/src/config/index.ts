import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export { APIS, getApiBase } from './api-config';

export const CREDENTIALS = process.env.CREDENTIALS === 'true';

export const {
  NODE_ENV,
  PORT,
  BASE_URL_PREFIX,
  SECRET_KEY,
  ORIGIN,
  LOG_FORMAT,
  LOG_DIR,
  API_BASE_URL,
  CLIENT_KEY,
  CLIENT_SECRET,
  MUNICIPALITY_ID,
  CITIZEN_PERSON_ID,
  CITIZEN_PERSON_NUMBER,
  CITIZEN_NAME,
  ADMIN_PERSON_ID,
  ADMIN_NAME,
} = process.env;
