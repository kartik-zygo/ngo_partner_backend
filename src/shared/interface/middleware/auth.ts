import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../../config/env';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors';
import type { Role } from '../../domain/constants';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Bearer token required');
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) throw new ForbiddenError();
    next();
  };
}
