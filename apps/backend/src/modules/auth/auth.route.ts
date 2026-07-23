import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import type { AppEnv } from '../../types/app-env';

const authRoutes = new Hono<AppEnv>();

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(6, 'Password harus memiliki minimal 6 karakter')
    .max(50, 'Password tidak boleh lebih dari 50 karakter'),
});

authRoutes.post('/login', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Body request harus berupa JSON yang valid',
        },
      },
      400,
    );
  }

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Body request tidak valid',
          details: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      422,
    );
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
    return c.json(
      {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau password salah',
        },
      },
      401,
    );
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '8h',
    },
  );

  return c.json({
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    },
  });
});

export { authRoutes };
