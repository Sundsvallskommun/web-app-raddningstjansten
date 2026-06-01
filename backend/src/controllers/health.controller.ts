import { Controller, Get } from 'routing-controllers';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
