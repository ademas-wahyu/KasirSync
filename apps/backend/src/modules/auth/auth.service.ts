import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/errors/app-error';

import type { LoginInput } from './auth.schema';

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      branchId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'AUTH_INVALID', 'Email atau password salah');
  }

  const passwordValid = await bcrypt.compare(input.password, user.password);

  if (!passwordValid) {
    throw new AppError(401, 'AUTH_INVALID', 'Email atau password salah');
  }

  const token = jwt.sign({}, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: env.JWT_EXPIRED_IN,
  });

  return {
    token,
    tokenType: 'Bearer' as const,
    expiresIn: env.JWT_EXPIRED_IN,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    },
  };
}
