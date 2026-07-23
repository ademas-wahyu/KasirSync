import { beforeEach, describe, expect, test } from 'bun:test';

import app from '../../src/app';
import { resetAuthFixtures, testUsers } from '../helper/auth-fixtures';

type LoginResponse = {
  data: {
    token: string;
    user: {
      id: string;
      role: string;
      branchId: string | null;
    };
  };
};

async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  expect(response.status).toBe(200);

  return response.json() as Promise<LoginResponse>;
}

describe('Role middleware', () => {
  beforeEach(async () => {
    await resetAuthFixtures();
  });

  test('Super Admin dapat mengakses route manajemen', async () => {
    const loginBody = await login(testUsers.superAdmin.email, testUsers.superAdmin.password);

    const response = await app.request('/api/v1/admin/test', {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.authUser.role).toBe('SUPER_ADMIN');
  });

  test('Branch Manager dapat mengakses route manajemen', async () => {
    const loginBody = await login(testUsers.branchManager.email, testUsers.branchManager.password);

    const response = await app.request('/api/v1/admin/test', {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.authUser.role).toBe('BRANCH_MANAGER');
  });

  test('Cashier tidak dapat mengakses route manajemen', async () => {
    const loginBody = await login(testUsers.cashier.email, testUsers.cashier.password);

    const response = await app.request('/api/v1/admin/test', {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.error.code).toBe('ROLE_FORBIDDEN');

    expect(body.error.message).toBe('Anda tidak memiliki izin untuk mengakses fitur ini');
  });
});
