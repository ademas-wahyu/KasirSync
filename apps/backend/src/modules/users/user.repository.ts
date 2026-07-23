import { prisma } from '../../lib/prisma';

import type { Prisma } from '../../generated/prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  branchId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });
  },

  findManageableTarget(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });
  },

  branchExists(branchId: string) {
    return prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  },

  list(where: Prisma.UserWhereInput, skip: number, take: number) {
    return prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      select: publicUserSelect,
    });
  },

  count(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },
};
