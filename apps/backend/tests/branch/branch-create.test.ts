import { describe, expect, test, beforeEach } from 'bun:test';

import {
  createRequest,
  readJson,
  setupBranchFixtures,
  type BranchResponse,
  type ErrorResponse,
} from './branch-helpers';

describe('POST /api/v1/branches', () => {
  const request = createRequest();
  let superAdminToken: string;
  let branchManagerToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    const fixtures = await setupBranchFixtures();
    superAdminToken = fixtures.superAdminToken;
    branchManagerToken = fixtures.branchManagerToken;
    cashierToken = fixtures.cashierToken;
  });

  test('SUPER_ADMIN dapat membuat branch', async () => {
    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: 'sby-01',
      name: 'Surabaya Pusat',
      address: 'Jl. Surabaya No. 1',
      phone: '0311234567',
    });

    expect(response.status).toBe(201);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch).toEqual(
      expect.objectContaining({
        code: 'SBY-01',
        name: 'Surabaya Pusat',
        address: 'Jl. Surabaya No. 1',
        phone: '0311234567',
        isActive: true,
      }),
    );

    const branchInDatabase = await prisma.branch.findUnique({
      where: {
        code: 'SBY-01',
      },
    });

    expect(branchInDatabase).not.toBeNull();
    expect(branchInDatabase?.name).toBe('Surabaya Pusat');
  });

  test('kode branch dinormalisasi menjadi uppercase', async () => {
    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: '  smg-01  ',
      name: 'Semarang',
    });

    expect(response.status).toBe(201);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.code).toBe('SMG-01');
  });

  test('menolak kode branch yang sudah digunakan', async () => {
    const existingBranch = await prisma.branch.findFirstOrThrow();

    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: existingBranch.code,
      name: 'Branch Duplikat',
    });

    expect(response.status).toBe(409);

    const body = await readJson<ErrorResponse>(response);

    expect(body.error.code).toBe('BRANCH_CODE_ALREADY_EXISTS');
  });

  test('kode berbeda kapital tetap dianggap duplikat', async () => {
    const existingBranch = await prisma.branch.findFirstOrThrow();

    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: existingBranch.code.toLowerCase(),
      name: 'Branch Duplikat',
    });

    expect(response.status).toBe(409);

    const body = await readJson<ErrorResponse>(response);

    expect(body.error.code).toBe('BRANCH_CODE_ALREADY_EXISTS');
  });

  test('BRANCH_MANAGER tidak dapat membuat branch', async () => {
    const response = await request('POST', '/api/v1/branches', branchManagerToken, {
      code: 'MKS-01',
      name: 'Makassar',
    });

    expect(response.status).toBe(403);
  });

  test('CASHIER tidak dapat membuat branch', async () => {
    const response = await request('POST', '/api/v1/branches', cashierToken, {
      code: 'MKS-01',
      name: 'Makassar',
    });

    expect(response.status).toBe(403);
  });

  test('menolak request tanpa autentikasi', async () => {
    const response = await request('POST', '/api/v1/branches', undefined, {
      code: 'MKS-01',
      name: 'Makassar',
    });

    expect(response.status).toBe(401);
  });

  test('menolak kode branch dengan format tidak valid', async () => {
    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: 'JKT 01!',
      name: 'Jakarta',
    });

    expect([400, 422]).toContain(response.status);
  });

  test('menolak nama branch yang kosong', async () => {
    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: 'TGR-01',
      name: '',
    });

    expect([400, 422]).toContain(response.status);
  });

  test('dapat membuat branch tanpa address dan phone', async () => {
    const response = await request('POST', '/api/v1/branches', superAdminToken, {
      code: 'MKS-01',
      name: 'Makassar',
    });

    expect(response.status).toBe(201);

    const body = await readJson<BranchResponse>(response);

    expect(body.data.branch.code).toBe('MKS-01');
    expect(body.data.branch.name).toBe('Makassar');
    expect(body.data.branch.address).toBeNull();
    expect(body.data.branch.phone).toBeNull();
  });
});

import { prisma } from '../../src/lib/prisma';
