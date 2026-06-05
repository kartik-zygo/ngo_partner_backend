import { randomUUID } from 'crypto';

import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const existing = req.headers['x-correlation-id'];
  req.correlationId = typeof existing === 'string' && existing.length > 0
    ? existing
    : randomUUID();
  next();
}
