import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { ValidationError } from '../../domain/errors';

type Target = 'body' | 'query' | 'params';

export function validate<T extends z.ZodTypeAny>(schema: T, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten());
    }
    // Attach parsed data back so controllers receive coerced/defaulted values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
