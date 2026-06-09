import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

/**
 * Requires an admin whose role is 'editor' (full access). Viewers — and any
 * admin session created before roles existed — are blocked from write actions
 * (assign, decision). Pair after adminMiddleware on mutating admin endpoints.
 */
const editorMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.session?.user;
  if (user?.type === 'admin' && user.role === 'editor') {
    return next();
  }
  return next(new HttpException(403, 'FORBIDDEN_READ_ONLY'));
};

export default editorMiddleware;
