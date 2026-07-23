import { beforeEach, describe, expect, test } from 'bun:test';
import bcrypt from 'bcryptjs';

import { prisma } from '../../src/lib/prisma';
import { resetAuthFixtures } from '../helper/auth-fixtures';
import {
  superAdmin,
  manager,
  cashier,
  branchB,
  createToken,
  loadFixtures,
  requestJson,
  UserResponse,
} from './helpers/setup';

beforeEach(async () => {
  await resetAuthFixtures();
  await loadFixtures();
});

describe('PATCH /api/v1/users/:userId/password', () => {
  test('SUPER_ADMIN dapat mengganti password user', async () => {
    const oldPassword = (
      await prisma.user.findUniqueOrThrow({
        where: {
          id: manager.id,
        },
        select: {
          password: true,
        },
      })
    ).password;

    const newPassword = 'PasswordBaru123';

    const response = await requestJson(`/api/v1/users/${manager.id}/password`, {
      method: 'PATCH',
      token: createToken(superAdmin.id),
      body: {
        password: newPassword,
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data).not.toHaveProperty('password');

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: manager.id,
      },
      select: {
        password: true,
      },
    });

    expect(updatedUser.password).not.toBe(oldPassword);
    expect(updatedUser.password).not.toBe(newPassword);

    expect(await bcrypt.compare(newPassword, updatedUser.password)).toBe(true);
  });

  test('BRANCH_MANAGER dapat mengganti password kasir di cabangnya', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}/password`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        password: 'PasswordKasirBaru123',
      },
    });

    expect(response.status).toBe(200);

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: cashier.id,
      },
      select: {
        password: true,
      },
    });

    expect(await bcrypt.compare('PasswordKasirBaru123', storedUser.password)).toBe(true);
  });

  test('BRANCH_MANAGER tidak dapat mengganti password user cabang lain', async () => {
    const otherCashier = await prisma.user.create({
      data: {
        name: 'Kasir Password Branch B',
        email: 'kasir.password.branch.b@example.com',
        password: await bcrypt.hash('Password123', 12),
        role: 'CASHIER',
        branchId: branchB.id,
      },
    });

    const response = await requestJson(`/api/v1/users/${otherCashier.id}/password`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        password: 'PasswordBaru123',
      },
    });

    expect(response.status).toBe(403);
  });

  test('password baru minimal 8 karakter', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}/password`, {
      method: 'PATCH',
      token: createToken(superAdmin.id),
      body: {
        password: 'pendek',
      },
    });

    expect(response.status).toBe(400);
  });
});
