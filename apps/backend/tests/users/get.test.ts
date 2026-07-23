import { beforeEach, describe, expect, test } from 'bun:test';
import bcrypt from 'bcryptjs';

import { prisma } from '../../src/lib/prisma';
import { resetAuthFixtures } from '../helper/auth-fixtures';
import {
  superAdmin,
  manager,
  cashier,
  branchA,
  branchB,
  createToken,
  loadFixtures,
  requestJson,
  ErrorResponse,
  UserResponse,
} from './helpers/setup';

beforeEach(async () => {
  await resetAuthFixtures();
  await loadFixtures();
});

describe('GET /api/v1/users/:userId', () => {
  test('SUPER_ADMIN dapat melihat detail manager', async () => {
    const response = await requestJson(`/api/v1/users/${manager.id}`, {
      token: createToken(superAdmin.id),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data.id).toBe(manager.id);
    expect(body.data.role).toBe('BRANCH_MANAGER');
    expect(body.data).not.toHaveProperty('password');
  });

  test('BRANCH_MANAGER dapat melihat kasir di cabangnya', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      token: createToken(manager.id),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data.id).toBe(cashier.id);
    expect(body.data.branchId).toBe(branchA.id);
  });

  test('BRANCH_MANAGER tidak dapat melihat kasir cabang lain', async () => {
    const otherCashier = await prisma.user.create({
      data: {
        name: 'Kasir Cabang Lain',
        email: 'kasir.other.branch@example.com',
        password: await bcrypt.hash('Password123', 12),
        role: 'CASHIER',
        branchId: branchB.id,
      },
    });

    const response = await requestJson(`/api/v1/users/${otherCashier.id}`, {
      token: createToken(manager.id),
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('BRANCH_MANAGER tidak dapat mengelola akun manager', async () => {
    const response = await requestJson(`/api/v1/users/${manager.id}`, {
      token: createToken(manager.id),
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('menghasilkan 404 ketika user tidak ditemukan', async () => {
    const temporaryUser = await prisma.user.create({
      data: {
        name: 'Temporary User',
        email: 'temporary.user@example.com',
        password: await bcrypt.hash('Password123', 12),
        role: 'CASHIER',
        branchId: branchA.id,
      },
      select: {
        id: true,
      },
    });

    await prisma.user.delete({
      where: {
        id: temporaryUser.id,
      },
    });

    const response = await requestJson(`/api/v1/users/${temporaryUser.id}`, {
      token: createToken(superAdmin.id),
    });

    expect(response.status).toBe(404);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_NOT_FOUND');
  });
});
