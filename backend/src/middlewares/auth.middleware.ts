import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

/**
 * Allows the request through only when a (mock) login has put a user on the session.
 */
const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.session?.user) {
    return next();
  }
  return next(new HttpException(401, 'NOT_AUTHORIZED'));
};

export default authMiddleware;
