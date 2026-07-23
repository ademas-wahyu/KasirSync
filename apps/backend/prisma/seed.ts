import "dotenv/config";
import * as bcrypt from "bcryptjs";

import { PrismaClient, Role } from "../src/generated/prisma/client";

import { PrismaLibSql } from "@prisma/adapter-libsql";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = new PrismaLibSql({
  url: databaseUrl,
  ...(process.env.DATABASE_AUTH_TOKEN
    ? {
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
    : {}),
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const superAdminPassword = await bcrypt.hash("SuperAdmin123!", 10);

  const managerPassword = await bcrypt.hash("Manager123!", 10);

  const cashierPassword = await bcrypt.hash("Cashier123!", 10);

  // 1. Buat cabang pertama
  const branch = await prisma.branch.upsert({
    where: {
      code: "CBG-001",
    },
    update: {
      name: "Cabang Utama",
      address: "Alamat Cabang Utama",
      phone: "081234567890",
      isActive: true,
    },
    create: {
      code: "CBG-001",
      name: "Cabang Utama",
      address: "Alamat Cabang Utama",
      phone: "081234567890",
      timezone: "Asia/Jakarta",
      isActive: true,
    },
  });

  // 2. Buat Super Admin pusat
  const superAdmin = await prisma.user.upsert({
    where: {
      email: "superadmin@kasirsync.test",
    },
    update: {
      name: "Super Admin",
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      branchId: null,
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email: "superadmin@kasirsync.test",
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      branchId: null,
      isActive: true,
    },
  });

  // 3. Buat manager cabang
  const manager = await prisma.user.upsert({
    where: {
      email: "manager@kasirsync.test",
    },
    update: {
      name: "Manager Cabang Utama",
      password: managerPassword,
      role: Role.BRANCH_MANAGER,
      branchId: branch.id,
      isActive: true,
    },
    create: {
      name: "Manager Cabang Utama",
      email: "manager@kasirsync.test",
      password: managerPassword,
      role: Role.BRANCH_MANAGER,
      branchId: branch.id,
      isActive: true,
    },
  });

  // 4. Buat kasir
  const cashier = await prisma.user.upsert({
    where: {
      email: "cashier@kasirsync.test",
    },
    update: {
      name: "Kasir Cabang Utama",
      password: cashierPassword,
      role: Role.CASHIER,
      branchId: branch.id,
      isActive: true,
    },
    create: {
      name: "Kasir Cabang Utama",
      email: "cashier@kasirsync.test",
      password: cashierPassword,
      role: Role.CASHIER,
      branchId: branch.id,
      isActive: true,
    },
  });

  console.log("Seed selesai");
  console.table({
    branch: branch.name,
    superAdmin: superAdmin.email,
    manager: manager.email,
    cashier: cashier.email,
  });
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
