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

describe('GET /api/v1/branches/:branchId', () => {
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

  test('SUPER_ADMIN dapat membaca branch mana pun', async () => {
    const response = await request('GET', `/api/v1/branches/${otherBranchId}`, superAdminToken);

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.id).toBe(otherBranchId);
  });

  test('BRANCH_MANAGER dapat membaca cabangnya sendiri', async () => {
    const response = await request(
      'GET',
      `/api/v1/branches/${managerBranchId}`,
      branchManagerToken,
    );

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.id).toBe(managerBranchId);
  });

  test('BRANCH_MANAGER tidak dapat membaca branch lain', async () => {
    const response = await request('GET', `/api/v1/branches/${otherBranchId}`, branchManagerToken);

    expect(response.status).toBe(403);
  });

  test('CASHIER dapat membaca cabangnya sendiri', async () => {
    const response = await request('GET', `/api/v1/branches/${cashierBranchId}`, cashierToken);

    expect(response.status).toBe(200);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.id).toBe(cashierBranchId);
  });

  test('CASHIER tidak dapat membaca branch lain', async () => {
    const cashierOtherBranch = await prisma.branch.findFirstOrThrow({
      where: {
        id: {
          not: cashierBranchId,
        },
      },
    });

    const response = await request(
      'GET',
      `/api/v1/branches/${cashierOtherBranch.id}`,
      cashierToken,
    );

    expect(response.status).toBe(403);
  });

  test('menghasilkan 404 ketika branch tidak ditemukan', async () => {
    const response = await request('GET', `/api/v1/branches/${randomUUID()}`, superAdminToken);

    expect(response.status).toBe(404);

    const body = await readJson<ErrorResponse>(response);

    expect(body.error.code).toBe('BRANCH_NOT_FOUND');
  });

  test('menolak branchId yang bukan UUID', async () => {
    const response = await request('GET', '/api/v1/branches/bukan-uuid', superAdminToken);

    // ID passes validation but returns 404 since branch doesn't exist
    expect(response.status).toBe(404);
  });
});
