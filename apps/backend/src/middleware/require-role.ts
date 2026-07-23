import { createMiddleware } from 'hono/factory';

import type { Role } from '../generated/prisma/client';
import { AppError } from '../shared/errors/app-error';
import type { AppEnv } from '../types/app-env';

export function requireRole(...allowedRoles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authUser = c.get('authUser');

    if (!allowedRoles.includes(authUser.role)) {
      throw new AppError(
        403,
        'ROLE_FORBIDDEN',
        'Anda tidak memiliki izin untuk mengakses fitur ini',
      );
    }

    await next();
  });
}
