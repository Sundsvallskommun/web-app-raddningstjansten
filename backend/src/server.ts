import App from '@/app';
import validateEnv from '@utils/validateEnv';
import { seedMocks } from '@services/mock-seed.service';
import { HealthController } from '@controllers/health.controller';
import { CitizenAuthController } from '@controllers/citizen-auth.controller';
import { AdminAuthController } from '@controllers/admin-auth.controller';
import { MeController } from '@controllers/me.controller';
import { EngagementController } from '@controllers/engagement.controller';
import { ErrandController } from '@controllers/errand.controller';

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});

process.on('unhandledRejection', reason => {
  console.error('[UNHANDLED REJECTION]', reason);
});

validateEnv();

const app = new App([
  HealthController,
  CitizenAuthController,
  AdminAuthController,
  MeController,
  EngagementController,
  ErrandController,
]);

// Seed the citizen/employee mocks in the background; never block boot.
void seedMocks();

app.listen();
