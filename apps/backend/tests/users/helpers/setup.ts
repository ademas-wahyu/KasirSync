import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import app from '../../../src/app';
import { prisma } from '../../../src/lib/prisma';
import { resetAuthFixtures } from '../../helper/auth-fixtures';

// ============================================================================
// Types
// ============================================================================

export type FixtureUser = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER';
  branchId: string | null;
  isActive: boolean;
};

export type FixtureBranch = {
  id: string;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type UserResponse = {
  data: {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER';
    branchId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export type UserListResponse = {
  data: {
    items: Array<{
      id: string;
      name: string;
      email: string;
      role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER';
      branchId: string | null;
      isActive: boolean;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

// ============================================================================
// Shared Fixtures
// ============================================================================

export let superAdmin: FixtureUser;
export let manager: FixtureUser;
export let cashier: FixtureUser;
export let branchA: FixtureBranch;
export let branchB: FixtureBranch;

// ============================================================================
// Helpers
// ============================================================================

export function createToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET tidak tersedia pada test environment');
  }

  return jwt.sign(
    {
      sub: userId,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
  );
}

export async function requestJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Promise<Response> {
  const headers = new Headers();

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  return app.request(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function loadFixtures(): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
    },
  });

  const branches = await prisma.branch.findMany({
    select: {
      id: true,
    },
  });

  const foundSuperAdmin = users.find((user) => user.role === 'SUPER_ADMIN');
  const foundManager = users.find((user) => user.role === 'BRANCH_MANAGER');
  const foundCashier = users.find(
    (user) => user.role === 'CASHIER' && user.branchId === foundManager?.branchId,
  );

  if (!foundSuperAdmin) {
    throw new Error('Fixture SUPER_ADMIN tidak ditemukan');
  }

  if (!foundManager) {
    throw new Error('Fixture BRANCH_MANAGER tidak ditemukan');
  }

  if (!foundManager.branchId) {
    throw new Error('Fixture BRANCH_MANAGER tidak memiliki branchId');
  }

  if (!foundCashier) {
    throw new Error('Fixture CASHIER pada cabang manager tidak ditemukan');
  }

  const foundBranchA = branches.find((branch) => branch.id === foundManager.branchId);
  const foundBranchB = branches.find((branch) => branch.id !== foundManager.branchId);

  if (!foundBranchA || !foundBranchB) {
    throw new Error('Test membutuhkan minimal dua branch');
  }

  superAdmin = foundSuperAdmin;
  manager = foundManager;
  cashier = foundCashier;
  branchA = foundBranchA;
  branchB = foundBranchB;
}
