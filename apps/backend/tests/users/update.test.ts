import { beforeEach, describe, expect, test } from 'bun:test';

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

describe('PATCH /api/v1/users/:userId', () => {
  test('SUPER_ADMIN dapat memperbarui user', async () => {
    const response = await requestJson(`/api/v1/users/${manager.id}`, {
      method: 'PATCH',
      token: createToken(superAdmin.id),
      body: {
        name: 'Manager Diperbarui',
        email: 'manager.updated@example.com',
        branchId: branchB.id,
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data).toMatchObject({
      id: manager.id,
      name: 'Manager Diperbarui',
      email: 'manager.updated@example.com',
      branchId: branchB.id,
    });
  });

  test('BRANCH_MANAGER dapat memperbarui kasir di cabangnya', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        name: 'Kasir Diperbarui',
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as UserResponse;

    expect(body.data.name).toBe('Kasir Diperbarui');
  });

  test('BRANCH_MANAGER tidak dapat mengubah kasir menjadi manager', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        role: 'BRANCH_MANAGER',
      },
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('BRANCH_MANAGER tidak dapat memindahkan kasir ke cabang lain', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      method: 'PATCH',
      token: createToken(manager.id),
      body: {
        branchId: branchB.id,
      },
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('update email tetap memvalidasi email unik', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      method: 'PATCH',
      token: createToken(superAdmin.id),
      body: {
        email: manager.email.toUpperCase(),
      },
    });

    expect(response.status).toBe(409);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('EMAIL_ALREADY_USED');
  });

  test('body update tidak boleh kosong', async () => {
    const response = await requestJson(`/api/v1/users/${cashier.id}`, {
      method: 'PATCH',
      token: createToken(superAdmin.id),
      body: {},
    });

    expect(response.status).toBe(400);
  });
});
