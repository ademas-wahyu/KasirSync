import { sign } from 'jsonwebtoken';

import app from '../../src/app';
import { env } from '../../src/config/env';
import { prisma } from '../../src/lib/prisma';
import { resetAuthFixtures } from '../helper/auth-fixtures';

export interface BranchDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchResponse {
  data: {
    branch: BranchDto;
  };
}

export interface BranchListResponse {
  data: {
    branches: BranchDto[];
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BranchFixtures {
  superAdminToken: string;
  branchManagerToken: string;
  cashierToken: string;
  managerBranchId: string;
  cashierBranchId: string;
  otherBranchId: string;
}

export function createAccessToken(userId: string): string {
  return sign(
    {
      sub: userId,
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
  );
}

export function createRequest() {
  return async function request(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ): Promise<Response> {
    const headers = new Headers();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    return app.request(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function setupBranchFixtures(): Promise<BranchFixtures> {
  await resetAuthFixtures();

  const [superAdmin, branchManager, cashier, branches] = await Promise.all([
    prisma.user.findFirstOrThrow({
      where: {
        role: 'SUPER_ADMIN',
      },
    }),
    prisma.user.findFirstOrThrow({
      where: {
        role: 'BRANCH_MANAGER',
      },
    }),
    prisma.user.findFirstOrThrow({
      where: {
        role: 'CASHIER',
      },
    }),
    prisma.branch.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    }),
  ]);

  if (!branchManager.branchId) {
    throw new Error('Fixture BRANCH_MANAGER harus memiliki branchId');
  }

  if (!cashier.branchId) {
    throw new Error('Fixture CASHIER harus memiliki branchId');
  }

  const otherBranch = branches.find((branch) => branch.id !== branchManager.branchId);

  if (!otherBranch) {
    throw new Error('Fixture harus memiliki minimal dua branch');
  }

  const superAdminToken = createAccessToken(superAdmin.id);
  const branchManagerToken = createAccessToken(branchManager.id);
  const cashierToken = createAccessToken(cashier.id);

  return {
    superAdminToken,
    branchManagerToken,
    cashierToken,
    managerBranchId: branchManager.branchId,
    cashierBranchId: cashier.branchId,
    otherBranchId: otherBranch.id,
  };
}
