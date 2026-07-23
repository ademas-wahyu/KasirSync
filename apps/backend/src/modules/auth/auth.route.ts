import { Hono } from 'hono';

import { AppError } from '../../shared/errors/app-error';
import type { AppEnv } from '../../types/app-env';

import { loginSchema } from './auth.schema';
import { login } from './auth.service';

const authRoutes = new Hono<AppEnv>();

authRoutes.post('/login', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    throw new AppError(400, 'INVALID_REQUEST', 'Body request harus berupa JSON yang valid');
  }

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw new AppError(
      422,
      'INVALID_REQUEST',
      'Body request tidak valid',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  const data = await login(result.data);

  return c.json({
    data,
  });
});

export { authRoutes };
