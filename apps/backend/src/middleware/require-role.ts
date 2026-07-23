import { createMiddleware } from 'hono/factory';

import type { Role } from '../generated/prisma/client';
import type { AppEnv } from '../types/app-env';

export function requireRole(...allowedRoles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.get('role');

    if (!allowedRoles.includes(role)) {
      return c.json(
        {
          error: {
            code: 'ROLE_FORBIDDEN',
            message: 'Anda tidak memiliki izin untuk mengakses fitur ini',
          },
        },
        403,
      );
    }

    await next();
  });
}
