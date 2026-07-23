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

describe('PATCH /api/v1/users/:userId/status', () => {
  test('BRANCH_MANAGER dapat menonaktifkan kasir di cabangnya', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}/status`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        isActive: false,
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data.isActive).toBe(false);
  });

  test('token lama ditolak setelah user dinonaktifkan', async () => {
    const cashierToken = createToken(cashier.id);

    const activeResponse = await requestJson('/api/v1/users', {
      token: cashierToken,
    });

    expect(activeResponse.status).toBe(403);

    await requestJson(`/api/v1/users/${cashier.id}/status`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        isActive: false,
      },
    });

    const inactiveResponse = await requestJson('/api/v1/users', {
      token: cashierToken,
    });

    expect(inactiveResponse.status).toBe(401);
  });

  test('BRANCH_MANAGER tidak dapat menonaktifkan kasir cabang lain', async () => {
    const otherCashier = await prisma.user.create({
      data: {
        name: 'Kasir Branch B',
        email: 'kasir.status.branch.b@example.com',
        password: await bcrypt.hash('Password123', 12),
        role: 'CASHIER',
        branchId: branchB.id,
      },
    });

    const response = await requestJson(`/api/v1/users/${otherCashier.id}/status`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        isActive: false,
      },
    });

    expect(response.status).toBe(403);
  });
});
