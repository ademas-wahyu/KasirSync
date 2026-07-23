import { beforeEach, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';

import app from '../../src/app';
import { Role } from '../../src/generated/prisma/client';
import { auth } from '../../src/middleware/auth';
import { requireRole } from '../../src/middleware/require-role';
import { resolveBranchId } from '../../src/shared/auth/resolve-branch-id';
import { errorHandler } from '../../src/shared/http/handlers';
import type { AppEnv } from '../../src/types/app-env';

import { resetAuthFixtures, testUsers } from '../helper/auth-fixtures';
import type { Branch, User } from '../../src/generated/prisma/client';

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

type Fixtures = {
  branchA: Branch;
  branchB: Branch;
  superAdmin: User;
  branchManager: User;
  cashier: User;
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

function createBranchScopeTestApp() {
  const testApp = new Hono<AppEnv>();

  testApp.use('/branches/*', auth);

  testApp.get(
    '/branches/:branchId',
    requireRole(Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.CASHIER),
    (c) => {
      const authUser = c.get('authUser');

      const branchId = resolveBranchId(authUser, c.req.param('branchId'));

      return c.json({
        data: {
          branchId,
          role: authUser.role,
        },
      });
    },
  );

  testApp.onError(errorHandler);

  return testApp;
}

describe('Branch scope', () => {
  let fixtures: Fixtures;

  beforeEach(async () => {
    fixtures = (await resetAuthFixtures()) as unknown as Fixtures;
  });

  test('Manager dapat mengakses cabangnya sendiri', async () => {
    const loginBody = await login(testUsers.branchManager.email, testUsers.branchManager.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchA.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.branchId).toBe(fixtures.branchA.id);
    expect(body.data.role).toBe('BRANCH_MANAGER');
  });

  test('Manager tidak dapat mengakses cabang lain', async () => {
    const loginBody = await login(testUsers.branchManager.email, testUsers.branchManager.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchB.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.error.code).toBe('ROLE_FORBIDDEN');
    expect(body.error.message).toBe('Akses lintas cabang tidak diizinkan');
  });

  test('Cashier dapat mengakses cabangnya sendiri', async () => {
    const loginBody = await login(testUsers.cashier.email, testUsers.cashier.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchB.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.branchId).toBe(fixtures.branchB.id);
    expect(body.data.role).toBe('CASHIER');
  });

  test('Cashier tidak dapat mengakses cabang lain', async () => {
    const loginBody = await login(testUsers.cashier.email, testUsers.cashier.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchA.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.error.code).toBe('ROLE_FORBIDDEN');
    expect(body.error.message).toBe('Akses lintas cabang tidak diizinkan');
  });

  test('Super Admin dapat mengakses cabang A', async () => {
    const loginBody = await login(testUsers.superAdmin.email, testUsers.superAdmin.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchA.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.branchId).toBe(fixtures.branchA.id);
    expect(body.data.role).toBe('SUPER_ADMIN');
  });

  test('Super Admin dapat mengakses cabang B', async () => {
    const loginBody = await login(testUsers.superAdmin.email, testUsers.superAdmin.password);

    const testApp = createBranchScopeTestApp();

    const response = await testApp.request(`/branches/${fixtures.branchB.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.data.token}`,
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.branchId).toBe(fixtures.branchB.id);
    expect(body.data.role).toBe('SUPER_ADMIN');
  });
});
