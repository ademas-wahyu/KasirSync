import {
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';

import app from '../../src/app';
import { env } from '../../src/config/env';
import { auth } from '../../src/middleware/auth';
import { prisma } from '../../src/lib/prisma';
import { AppError } from '../../src/shared/errors/app-error';
import { errorHandler } from '../../src/shared/http/handlers';
import type { AppEnv } from '../../src/types/app-env';

import {
  resetAuthFixtures,
  testUsers,
} from '../helper/auth-fixtures';

type LoginResponse = {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
    };
  };
};

async function loginAsManager() {
  const response = await app.request(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email,
        password: testUsers.branchManager.password,
      }),
    },
  );

  expect(response.status).toBe(200);

  return response.json() as Promise<LoginResponse>;
}

describe('Authentication middleware', () => {
  beforeEach(async () => {
    await resetAuthFixtures();
  });

  test('request tanpa token menghasilkan 401', async () => {
    const response = await app.request(
      '/api/v1/admin/test',
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('format Authorization tidak valid menghasilkan 401', async () => {
    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: 'Token abc123',
        },
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('token rusak menghasilkan 401', async () => {
    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: 'Bearer token-rusak',
        },
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_INVALID');
  });

  test('token kedaluwarsa menghasilkan 401', async () => {
    const fixtures = await resetAuthFixtures();

    const expiredToken = jwt.sign(
      {},
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: fixtures.branchManager.id,
        expiresIn: -1,
      },
    );

    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_EXPIRED');
  });

  test('token tanpa subject menghasilkan 401', async () => {
    const tokenWithoutSubject = jwt.sign(
      {},
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );

    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: `Bearer ${tokenWithoutSubject}`,
        },
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_INVALID');
  });

  test('user terbaru dibaca dari database', async () => {
    const loginBody = await loginAsManager();

    await prisma.user.update({
      where: {
        email: testUsers.branchManager.email,
      },
      data: {
        name: 'Manager Updated',
      },
    });

    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: `Bearer ${loginBody.data.token}`,
        },
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.authUser.name).toBe(
      'Manager Updated',
    );
  });

  test('user yang dinonaktifkan setelah login menghasilkan 401', async () => {
    const loginBody = await loginAsManager();

    await prisma.user.update({
      where: {
        email: testUsers.branchManager.email,
      },
      data: {
        isActive: false,
      },
    });

    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: `Bearer ${loginBody.data.token}`,
        },
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_INVALID');
  });

  test('authUser disimpan ke Hono context', async () => {
    const loginBody = await loginAsManager();

    const response = await app.request(
      '/api/v1/admin/test',
      {
        headers: {
          Authorization: `Bearer ${loginBody.data.token}`,
        },
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.data.authUser).toBeDefined();
    expect(body.data.authUser.id).toBeString();
    expect(body.data.authUser.email).toBe(
      testUsers.branchManager.email,
    );
    expect(body.data.authUser.role).toBe(
      'BRANCH_MANAGER',
    );
    expect(body.data.authUser.isActive).toBe(true);
  });

  test('error route tidak berubah menjadi error JWT', async () => {
    const loginBody = await loginAsManager();

    const testApp = new Hono<AppEnv>();

    testApp.use('/protected/*', auth);

    testApp.get('/protected/error', () => {
      throw new AppError(
        418,
        'TEST_ROUTE_ERROR',
        'Error dari route',
      );
    });

    testApp.onError(errorHandler);

    const response = await testApp.request(
      '/protected/error',
      {
        headers: {
          Authorization: `Bearer ${loginBody.data.token}`,
        },
      },
    );

    expect(response.status).toBe(418);

    const body = await response.json();

    expect(body.error.code).toBe(
      'TEST_ROUTE_ERROR',
    );

    expect(body.error.code).not.toBe(
      'AUTH_INVALID',
    );
  });
});