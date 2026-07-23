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

describe('POST /api/v1/users', () => {
  test('SUPER_ADMIN dapat membuat BRANCH_MANAGER', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Manager Baru',
        email: 'manager.baru@example.com',
        password: 'Password123',
        role: 'BRANCH_MANAGER',
        branchId: branchB.id,
      },
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as UserResponse;

    expect(body.data).toMatchObject({
      name: 'Manager Baru',
      email: 'manager.baru@example.com',
      role: 'BRANCH_MANAGER',
      branchId: branchB.id,
      isActive: true,
    });

    expect(body.data).not.toHaveProperty('password');
  });

  test('SUPER_ADMIN dapat membuat CASHIER', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Kasir Baru',
        email: 'kasir.baru@example.com',
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as UserResponse;

    expect(body.data).toMatchObject({
      name: 'Kasir Baru',
      email: 'kasir.baru@example.com',
      role: 'CASHIER',
      branchId: branchA.id,
    });
  });

  test('password disimpan dalam bentuk hash', async () => {
    const plainPassword = 'Password123';

    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Kasir Password',
        email: 'kasir.password@example.com',
        password: plainPassword,
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(201);

    const storedUser = await prisma.user.findUnique({
      where: {
        email: 'kasir.password@example.com',
      },
      select: {
        password: true,
      },
    });

    expect(storedUser).not.toBeNull();
    expect(storedUser!.password).not.toBe(plainPassword);

    const passwordMatches = await bcrypt.compare(plainPassword, storedUser!.password);

    expect(passwordMatches).toBe(true);
  });

  test('email dinormalisasi menjadi lowercase', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Kasir Email',
        email: 'KASIR.EMAIL@EXAMPLE.COM',
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as UserResponse;

    expect(body.data.email).toBe('kasir.email@example.com');
  });

  test('email harus unik setelah normalisasi', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'User Duplikat',
        email: cashier.email.toUpperCase(),
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(409);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('EMAIL_ALREADY_USED');
  });

  test('BRANCH_MANAGER dapat membuat CASHIER di cabangnya', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(manager.id),
      body: {
        name: 'Kasir Cabang Manager',
        email: 'kasir.manager@example.com',
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as UserResponse;

    expect(body.data.role).toBe('CASHIER');
    expect(body.data.branchId).toBe(branchA.id);
  });

  test('BRANCH_MANAGER tidak dapat membuat manager', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(manager.id),
      body: {
        name: 'Manager Ilegal',
        email: 'manager.ilegal@example.com',
        password: 'Password123',
        role: 'BRANCH_MANAGER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('BRANCH_MANAGER tidak dapat membuat kasir di cabang lain', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(manager.id),
      body: {
        name: 'Kasir Cabang Lain',
        email: 'kasir.cabang.lain@example.com',
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchB.id,
      },
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('USER_SCOPE_FORBIDDEN');
  });

  test('CASHIER tidak dapat membuat user', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(cashier.id),
      body: {
        name: 'Kasir Buatan Kasir',
        email: 'kasir.invalid@example.com',
        password: 'Password123',
        role: 'CASHIER',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(403);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('ROLE_FORBIDDEN');
  });

  test('manager dan kasir wajib memiliki branchId', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Kasir Tanpa Cabang',
        email: 'tanpa.cabang@example.com',
        password: 'Password123',
        role: 'CASHIER',
      },
    });

    expect(response.status).toBe(400);
  });

  test('branchId harus merujuk ke branch yang tersedia', async () => {
    const temporaryBranch = await prisma.branch.create({
      data: {
        name: 'Temporary Branch',
        code: 'TEMP-BRANCH',
      },
      select: {
        id: true,
      },
    });

    await prisma.branch.delete({
      where: {
        id: temporaryBranch.id,
      },
    });

    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Kasir Branch Hilang',
        email: 'branch.hilang@example.com',
        password: 'Password123',
        role: 'CASHIER',
        branchId: temporaryBranch.id,
      },
    });

    expect(response.status).toBe(422);

    const body = (await response.json()) as ErrorResponse;

    expect(body.error.code).toBe('INVALID_REQUEST');
  });

  test('endpoint tidak dapat digunakan untuk membuat SUPER_ADMIN', async () => {
    const response = await requestJson('/api/v1/users', {
      method: 'POST',
      token: createToken(superAdmin.id),
      body: {
        name: 'Super Admin Baru',
        email: 'superadmin.baru@example.com',
        password: 'Password123',
        role: 'SUPER_ADMIN',
        branchId: branchA.id,
      },
    });

    expect(response.status).toBe(400);
  });
});
