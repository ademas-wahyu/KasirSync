import type { Context } from 'hono';

import { env } from '../../config/env';
import type { AppEnv } from '../../types/app-env';
import { AppError } from '../errors/app-error';

export function notFoundHandler(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route tidak ditemukan',
        path: c.req.path,
      },
    },
    404,
  );
}

export function errorHandler(error: Error, c: Context<AppEnv>) {
  if (error instanceof AppError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      error.status,
    );
  }

  console.error({
    name: error.name,
    message: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    },
    500,
  );
}
