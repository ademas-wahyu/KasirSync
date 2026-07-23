import * as bcrypt from 'bcryptjs';
import { env } from '../../src/config/env';
import { Role } from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';

export const testUsers = {
  superAdmin: {
    email: 'superadmin@test.local',
    password: 'SuperAdmin123!',
  },
  branchManager: {
    email: 'manager@test.local',
    password: 'Manager123!',
  },
  cashier: {
    email: 'cashier@test.local',
    password: 'Cashier123!',
  },
};

function assertTestDatabase() {
  if (env.NODE_ENV !== 'test' || !env.DATABASE_URL.includes('test.db')) {
    throw new Error(
      `Test hanya boleh menggunakan test.db DATABASE saat ini env.NODE_ENV: ${env.NODE_ENV}, env.DATABASE_URL: ${env.DATABASE_URL}`,
    );
  }
}

export async function resetAuthFixtures() {
  assertTestDatabase();

  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  const branchA = await prisma.branch.create({
    data: {
      code: 'BRANCH-A',
      name: 'Branch A',
      address: 'Address Branch A',
      phone: '081234567890',
      timezone: 'Asia/Jakarta',
      isActive: true,
    },
  });

  const branchB = await prisma.branch.create({
    data: {
      code: 'BRANCH-B',
      name: 'Branch B',
      address: 'Address Branch B',
      phone: '081234567891',
      timezone: 'Asia/Jakarta',
      isActive: true,
    },
  });

  const [superAdminPassword, branchManagerPassword, cashierPassword] = await Promise.all([
    bcrypt.hash(testUsers.superAdmin.password, 10),
    bcrypt.hash(testUsers.branchManager.password, 10),
    bcrypt.hash(testUsers.cashier.password, 10),
  ]);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin test',
      email: testUsers.superAdmin.email,
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      branchId: null,
      isActive: true,
    },
  });

  const branchManager = await prisma.user.create({
    data: {
      name: 'Branch Manager test',
      email: testUsers.branchManager.email,
      password: branchManagerPassword,
      role: Role.BRANCH_MANAGER,
      branchId: branchA.id,
      isActive: true,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Cashier test',
      email: testUsers.cashier.email,
      password: cashierPassword,
      role: Role.CASHIER,
      branchId: branchB.id,
      isActive: true,
    },
  });

  return {
    branchA,
    branchB,
    superAdmin,
    branchManager,
    cashier,
  };
}
