import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validateBody = <T>(schema: ZodType<T>) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return next(parsed.error);
    }

    request.body = parsed.data;
    return next();
  };

