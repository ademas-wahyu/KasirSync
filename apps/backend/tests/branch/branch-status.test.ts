import { randomUUID } from 'node:crypto';

import { describe, expect, test, beforeEach } from 'bun:test';

import { prisma } from '../../src/lib/prisma';
import {
  createRequest,
  readJson,
  setupBranchFixtures,
  type BranchResponse,
} from './branch-helpers';

describe('PATCH /api/v1/branches/:branchId/status', () => {
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

  test('SUPER_ADMIN dapat menonaktifkan branch', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}/status`,
      superAdminToken,
      {
        isActive: false,
      },
    );

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.id).toBe(otherBranchId);
    expect(body.data.branch.isActive).toBe(false);

    const branchInDatabase = await prisma.branch.findUniqueOrThrow({
      where: {
        id: otherBranchId,
      },
    });

    expect(branchInDatabase.isActive).toBe(false);
  });

  test('SUPER_ADMIN dapat mengaktifkan kembali branch', async () => {
    await prisma.branch.update({
      where: {
        id: otherBranchId,
      },
      data: {
        isActive: false,
      },
    });

    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}/status`,
      superAdminToken,
      {
        isActive: true,
      },
    );

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.isActive).toBe(true);
  });

  test('menolak status selain boolean', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}/status`,
      superAdminToken,
      {
        isActive: 'false',
      },
    );

    expect([400, 422]).toContain(response.status);
  });

  test('menolak body tanpa isActive', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${otherBranchId}/status`,
      superAdminToken,
      {},
    );

    expect([400, 422]).toContain(response.status);
  });

  test('BRANCH_MANAGER tidak dapat mengubah status branch', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${managerBranchId}/status`,
      branchManagerToken,
      {
        isActive: false,
      },
    );

    expect(response.status).toBe(403);
  });

  test('CASHIER tidak dapat mengubah status branch', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${cashierBranchId}/status`,
      cashierToken,
      {
        isActive: false,
      },
    );

    expect(response.status).toBe(403);
  });

  test('menghasilkan 404 ketika branch tidak ditemukan', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/branches/${randomUUID()}/status`,
      superAdminToken,
      {
        isActive: false,
      },
    );

    expect(response.status).toBe(404);
  });
});
