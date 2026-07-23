import { createMiddleware } from 'hono/factory';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env';
import type { Role } from '../generated/prisma/client';
import type { AppEnv } from '../types/app-env';

const validRoles: readonly Role[] = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'];

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && validRoles.includes(value as Role);
}

export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return c.json(
      {
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Bearer token diperlukan',
        },
      },
      401,
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return c.json(
      {
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Token tidak ditemukan',
        },
      },
      401,
    );
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json(
        {
          error: {
            code: 'AUTH_EXPIRED',
            message: 'Token sudah kedaluwarsa',
          },
        },
        401,
      );
    }

    return c.json(
      {
        error: {
          code: 'AUTH_INVALID',
          message: 'Token tidak valid',
        },
      },
      401,
    );
  }

  if (typeof payload === 'string' || typeof payload.userId !== 'string' || !isRole(payload.role)) {
    return c.json(
      {
        error: {
          code: 'AUTH_INVALID_PAYLOAD',
          message: 'Payload token tidak valid',
        },
      },
      401,
    );
  }

  c.set('userId', payload.userId);
  c.set('role', payload.role);

  await next();
});
