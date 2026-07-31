import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../../config/env.js';
import { AppError } from './app-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, `Route ${request.method} ${request.path} was not found.`));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(422).json({
      message: 'Please correct the highlighted fields.',
      errors: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return response.status(409).json({ message: 'A record with these details already exists.' });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  // ORM error messages can include request values. Never emit the raw error
  // object here, because it may contain credentials or other personal data.
  console.error('Unhandled API error', {
    name: error instanceof Error ? error.name : 'UnknownError',
  });
  return response.status(500).json({
    message: env.NODE_ENV === 'production' ? 'Something went wrong.' : 'An unexpected server error occurred.',
  });
};
