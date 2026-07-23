import { randomUUID } from 'node:crypto';

import { describe, expect, test, beforeEach } from 'bun:test';

import { prisma } from '../../src/lib/prisma';
import {
  createRequest,
  readJson,
  setupBranchFixtures,
  type BranchResponse,
  type ErrorResponse,
} from './branch-helpers';

describe('PATCH /api/v1/branches/:branchId', () => {
  const request = createRequest();
  let superAdminToken: string;
  let branchManagerToken: string;
  let cashierToken: string;
  let managerBranchId: string;
  let cashierBranchId: string;
  let otherBranchId: string;

  beforeEach(async () => {
    const fixtures = await setupBranchFixtures();
    superAdminToken = fixtures.superAdminToken;
    branchManagerToken = fixtures.branchManagerToken;
    cashierToken = fixtures.cashierToken;
    managerBranchId = fixtures.managerBranchId;
    cashierBranchId = fixtures.cashierBranchId;
    otherBranchId = fixtures.otherBranchId;
  });

  test('SUPER_ADMIN dapat mengubah informasi branch', async () => {
    const response = await request('PATCH', `/api/v1/branches/${otherBranchId}`, superAdminToken, {
      name: 'Nama Branch Baru',
      address: 'Alamat Baru',
      phone: '08123456789',
    });

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch).toEqual(
      expect.objectContaining({
        id: otherBranchId,
        name: 'Nama Branch Baru',
        address: 'Alamat Baru',
        phone: '08123456789',
      }),
    );

    const branchInDatabase = await prisma.branch.findUniqueOrThrow({
      where: {
        id: otherBranchId,
      },
    });

    expect(branchInDatabase.name).toBe('Nama Branch Baru');
  });

  test('SUPER_ADMIN dapat mengubah kode branch', async () => {
    const response = await request('PATCH', `/api/v1/branches/${otherBranchId}`, superAdminToken, {
      code: '  ygy-01  ',
    });

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.code).toBe('YGY-01');
  });

  test('menolak perubahan ke kode yang sudah digunakan', async () => {
    const branchWithExistingCode = await prisma.branch.findFirstOrThrow({
      where: {
        id: {
          not: otherBranchId,
        },
      },
    });

    const response = await request('PATCH', `/api/v1/branches/${otherBranchId}`, superAdminToken, {
      code: branchWithExistingCode.code,
    });

    expect(response.status).toBe(409);

    const body = await readJson<ErrorResponse>(response);

    expect(body.error.code).toBe('BRANCH_CODE_ALREADY_EXISTS');
  });

  test('kode branch saat ini boleh dikirim kembali', async () => {
    const branch = await prisma.branch.findUniqueOrThrow({
      where: {
        id: otherBranchId,
      },
    });

    const response = await request('PATCH', `/api/v1/branches/${otherBranchId}`, superAdminToken, {
      code: branch.code,
      name: 'Nama Diperbarui',
    });

    expect(response.status).toBe(200);
  });

  test('dapat menghapus address dan phone dengan null', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}`,
      superAdminToken,
      {
        address: null,
        phone: null,
      },
    );

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.address).toBeNull();
    expect(body.data.branch.phone).toBeNull();
  });

  test('menolak body kosong', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}`,
      superAdminToken,
      {},
    );

    expect([400, 422]).toContain(response.status);
  });

  test('BRANCH_MANAGER tidak dapat mengubah branch', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${managerBranchId}`,
      branchManagerToken,
      {
        name: 'Perubahan Tidak Diizinkan',
      },
    );

    expect(response.status).toBe(403);
  });

  test('CASHIER tidak dapat mengubah branch', async () => {
    const response = await request('PATCH', `/api/v1/branches/${cashierBranchId}`, cashierToken, {
      name: 'Perubahan Tidak Diizinkan',
    });

    expect(response.status).toBe(403);
  });

  test('menghasilkan 404 ketika branch tidak ditemukan', async () => {
    const response = await request('PATCH', `/api/v1/branches/${randomUUID()}`, superAdminToken, {
      name: 'Branch Tidak Ada',
    });

    expect(response.status).toBe(404);
  });
});
