import { beforeEach, describe, expect, test } from 'bun:test';
import jwt, { JwtPayload } from 'jsonwebtoken';

import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetAuthFixtures, testUsers } from '../helper/auth-fixtures';

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await resetAuthFixtures();
  });

  test('Login berhasil dan menghasilkan token JWT yang valid', async () => {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email,
        password: testUsers.branchManager.password,
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.token).toBeString();
    expect(body.data.tokenType).toBe('Bearer');
    expect(body.data.user.email).toBe(testUsers.branchManager.email);
    expect(body.data.user.branchId).toBeString();
  });

  test('email di normalisasi menjadi huruf kecil sebelum dicocokkan', async () => {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email.toUpperCase(),
        password: testUsers.branchManager.password,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.user.email).toBe(testUsers.branchManager.email);
  });

  test('password salah menghasilkan 401', async () => {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email,
        password: 'PasswordSalah123!',
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_INVALID');
  });

  test('user nonaktif tidak dapat login', async () => {
    await prisma.user.update({
      where: {
        email: testUsers.branchManager.email,
      },
      data: {
        isActive: false,
      },
    });

    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email,
        password: testUsers.branchManager.password,
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error.code).toBe('AUTH_INVALID');
  });

  test('JWT hanya menyimpan subject user ID', async () => {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUsers.branchManager.email,
        password: testUsers.branchManager.password,
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    const payload = jwt.decode(body.data.token) as JwtPayload | null;

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBeString();
    expect(payload?.iat).toBeNumber();
    expect(payload?.exp).toBeNumber();

    expect(payload?.userId).toBeUndefined();
    expect(payload?.role).toBeUndefined();
    expect(payload?.email).toBeUndefined();
    expect(payload?.branchId).toBeUndefined();
  });
});

test('body tidak valid menghasilkan 422', async () => {
  const response = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'bukan-email',
      password: '123',
    }),
  });

  expect(response.status).toBe(422);

  const body = await response.json();

  expect(body.error.code).toBe('INVALID_REQUEST');
  expect(body.error.details).toBeArray();
});
