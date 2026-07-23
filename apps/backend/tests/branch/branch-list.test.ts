import { describe, expect, test, beforeEach } from 'bun:test';

import { prisma } from '../../src/lib/prisma';
import {
  createRequest,
  readJson,
  setupBranchFixtures,
  type BranchListResponse,
} from './branch-helpers';

describe('GET /api/v1/branches', () => {
  const request = createRequest();
  let superAdminToken: string;
  let branchManagerToken: string;
  let cashierToken: string;
  let managerBranchId: string;
  let cashierBranchId: string;

  beforeEach(async () => {
    const fixtures = await setupBranchFixtures();
    superAdminToken = fixtures.superAdminToken;
    branchManagerToken = fixtures.branchManagerToken;
    cashierToken = fixtures.cashierToken;
    managerBranchId = fixtures.managerBranchId;
    cashierBranchId = fixtures.cashierBranchId;
  });

  test('SUPER_ADMIN mendapatkan seluruh branch', async () => {
    const expectedBranches = await prisma.branch.findMany();

    const response = await request('GET', '/api/v1/branches', superAdminToken);

    expect(response.status).toBe(200);

    const body = await readJson<BranchListResponse>(response);

    expect(body.data.branches).toHaveLength(expectedBranches.length);

    expect(body.data.branches.map((branch) => branch.id).sort()).toEqual(
      expectedBranches.map((branch) => branch.id).sort(),
    );
  });

  test('BRANCH_MANAGER hanya mendapatkan cabangnya sendiri', async () => {
    const response = await request('GET', '/api/v1/branches', branchManagerToken);

    expect(response.status).toBe(200);

    const body = await readJson<BranchListResponse>(response);

    expect(body.data.branches).toHaveLength(1);
    expect(body.data.branches[0]?.id).toBe(managerBranchId);
  });

  test('CASHIER hanya mendapatkan cabangnya sendiri', async () => {
    const response = await request('GET', '/api/v1/branches', cashierToken);

    expect(response.status).toBe(200);

    const body = await readJson<BranchListResponse>(response);

    expect(body.data.branches).toHaveLength(1);
    expect(body.data.branches[0]?.id).toBe(cashierBranchId);
  });

  test('menolak request tanpa autentikasi', async () => {
    const response = await request('GET', '/api/v1/branches');

    expect(response.status).toBe(401);
  });
});
