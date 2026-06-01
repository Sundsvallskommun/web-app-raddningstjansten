import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

/**
 * Requires an authenticated session whose user is of type 'admin'.
 */
const adminMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.session?.user?.type === 'admin') {
    return next();
  }
  return next(new HttpException(403, 'FORBIDDEN'));
};

export default adminMiddleware;
