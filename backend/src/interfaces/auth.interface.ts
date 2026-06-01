import { Request } from 'express';
import { SessionUser } from './user.interface';

export interface RequestWithUser extends Request {
  user: SessionUser;
}
