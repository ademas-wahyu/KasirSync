import { createMiddleware } from 'hono/factory';
import jwt, { type JwtPayload, TokenExpiredError } from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../shared/errors/app-error';
import type { AppEnv } from '../types/app-env';

function getBearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw new AppError(401, 'UNAUTHORIZED', 'Header Authorization tidak ditemukan');
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    throw new AppError(401, 'UNAUTHORIZED', 'Header Authorization tidak valid');
  }

  return parts[1];
}

export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getBearerToken(c.req.header('Authorization'));

  let payload: JwtPayload;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.length === 0
    ) {
      throw new AppError(401, 'AUTH_EXPIRED', 'Token tidak valid');
    }

    payload = decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError(401, 'AUTH_EXPIRED', 'Token telah kedaluwarsa');
    }

    throw new AppError(401, 'AUTH_INVALID', 'Token tidak valid');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'AUTH_INVALID', 'Token tidak valid');
  }

  c.set('authUser', user);

  await next();
});
