import { cleanEnv, port, str, url } from 'envalid';

// Make sure the essentials are present in the environment before booting.
const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    BASE_URL_PREFIX: str(),
    SECRET_KEY: str(),
    ORIGIN: str(),
    API_BASE_URL: url(),
    CLIENT_KEY: str(),
    CLIENT_SECRET: str(),
    MUNICIPALITY_ID: str(),
    CITIZEN_PERSON_ID: str(),
    CITIZEN_PERSON_NUMBER: str(),
    ADMIN_PERSON_ID: str(),
  });
};

export default validateEnv;
