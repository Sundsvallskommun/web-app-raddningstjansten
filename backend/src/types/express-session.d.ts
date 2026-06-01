import 'express-session';
import { SessionUser } from '@interfaces/user.interface';

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
