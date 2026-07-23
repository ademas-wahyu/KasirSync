import { prisma } from '../../lib/prisma';

export interface CreateBranchData {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface UpdateBranchData {
  code?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
}

const branchSelect = {
  id: true,
  code: true,
  name: true,
  address: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const branchRepository = {
  create(data: CreateBranchData) {
    return prisma.branch.create({
      data,
      select: branchSelect,
    });
  },

  findAll() {
    return prisma.branch.findMany({
      select: branchSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  findById(id: string) {
    return prisma.branch.findUnique({
      where: { id },
      select: branchSelect,
    });
  },

  findByCode(code: string, excludeBranchId?: string) {
    return prisma.branch.findFirst({
      where: {
        code,
        ...(excludeBranchId ? { id: { not: excludeBranchId } } : {}),
      },
      select: {
        id: true,
        code: true,
      },
    });
  },

  update(id: string, data: UpdateBranchData) {
    return prisma.branch.update({
      where: { id },
      data,
      select: branchSelect,
    });
  },

  updateStatus(id: string, isActive: boolean) {
    return prisma.branch.update({
      where: { id },
      data: {
        isActive,
      },
      select: branchSelect,
    });
  },
};
