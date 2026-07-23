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
  UserListResponse,
} from './helpers/setup';

beforeEach(async () => {
  await resetAuthFixtures();
  await loadFixtures();
});

describe('GET /api/v1/users', () => {
  test('SUPER_ADMIN dapat melihat daftar user', async () => {
    const response = await requestJson('/api/v1/users?page=1&limit=20', {
      token: createToken(superAdmin.id),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserListResponse;

    expect(body.data.items.length).toBeGreaterThanOrEqual(3);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
  });

  test('BRANCH_MANAGER hanya melihat kasir di cabangnya', async () => {
    await prisma.user.create({
      data: {
        name: 'Kasir Cabang B',
        email: 'kasir.branch.b@example.com',
        password: await bcrypt.hash('Password123', 12),
        role: 'CASHIER',
        branchId: branchB.id,
      },
    });

    const response = await requestJson('/api/v1/users', {
      token: createToken(manager.id),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserListResponse;

    expect(body.data.items.length).toBeGreaterThan(0);

    for (const user of body.data.items) {
      expect(user.role).toBe('CASHIER');
      expect(user.branchId).toBe(branchA.id);
    }

    expect(body.data.items.some((user) => user.email === 'kasir.branch.b@example.com')).toBe(false);
  });

  test('CASHIER tidak dapat melihat daftar user', async () => {
    const response = await requestJson('/api/v1/users', {
      token: createToken(cashier.id),
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('ROLE_FORBIDDEN');
  });
});
