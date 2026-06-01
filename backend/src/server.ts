import App from '@/app';
import validateEnv from '@utils/validateEnv';
import { HealthController } from '@controllers/health.controller';
import { CitizenAuthController } from '@controllers/citizen-auth.controller';
import { MeController } from '@controllers/me.controller';

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});

process.on('unhandledRejection', reason => {
  console.error('[UNHANDLED REJECTION]', reason);
});

validateEnv();

const app = new App([HealthController, CitizenAuthController, MeController]);

app.listen();
