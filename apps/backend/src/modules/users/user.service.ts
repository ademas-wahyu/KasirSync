import * as bcrypt from 'bcryptjs';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthUser } from '../../types/app-env';
import { AppError } from '../../shared/errors/app-error';
import { userRepository } from './user.repository';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './user.schema';

const PASSWORD_ROUNDS = 12;

type ManageableUser = {
  id: string;
  role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER';
  branchId: string | null;
};

function assertManagerHasBranch(actor: AuthUser): string {
  if (!actor.branchId) {
    throw new AppError(403, 'USER_SCOPE_FORBIDDEN', 'User tidak memiliki akses ke cabang manapun');
  }

  return actor.branchId;
}

function assertCanManageTarget(actor: AuthUser, target: ManageableUser): void {
  if (actor.role === 'SUPER_ADMIN') {
    if (target.role === 'SUPER_ADMIN') {
      throw new AppError(
        403,
        'USER_SCOPE_FORBIDDEN',
        'Super Admin tidak dapat dikelola melalui endpoint ini',
      );
    }

    return;
  }

  const actorBranchId = assertManagerHasBranch(actor);

  if (target.role !== 'CASHIER' || target.branchId !== actorBranchId) {
    throw new AppError(
      403,
      'USER_SCOPE_FORBIDDEN',
      'Manager hanya dapat mengelola kasir di cabang yang sama',
    );
  }
}

async function assertBranchExists(branchId: string): Promise<void> {
  const branch = await userRepository.branchExists(branchId);

  if (!branch) {
    throw new AppError(422, 'INVALID_REQUEST', 'Cabang tidak ditemukan');
  }
}

async function assertEmailAvailable(email: string, ignoredUserId?: string): Promise<void> {
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser && existingUser.id !== ignoredUserId) {
    throw new AppError(409, 'EMAIL_ALREADY_USED', 'Email sudah digunakan');
  }
}
async function getTargetOrThrow(userId: string) {
  const target = await userRepository.findManageableTarget(userId);

  if (!target) {
    throw new AppError(404, 'USR_NOT_FOUND', 'User tidak ditemukan');
  }

  return target;
}

export const userService = {
  async create(actor: AuthUser, input: CreateUserInput) {
    let branchId: string;

    if (actor.role === 'BRANCH_MANAGER') {
      const actorBranchId = assertManagerHasBranch(actor);

      if (input.role !== 'CASHIER') {
        throw new AppError(
          403,
          'USER_SCOPE_FORBIDDEN',
          'Manager hanya dapat membuat user dengan role kasir',
        );
      }

      if (input.branchId !== actorBranchId) {
        throw new AppError(
          403,
          'USER_SCOPE_FORBIDDEN',
          'Manager hanya dapat membuat user di cabang yang sama',
        );
      }

      branchId = actorBranchId;
    } else {
      branchId = input.branchId;
    }

    await Promise.all([assertEmailAvailable(input.email), assertBranchExists(branchId)]);

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);

    return userRepository.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: input.role,
      branch: {
        connect: {
          id: branchId,
        },
      },
    });
  },

  async list(actor: AuthUser, query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {};

    if (actor.role === 'BRANCH_MANAGER') {
      where.role = 'CASHIER';
      where.branchId = assertManagerHasBranch(actor);
    } else {
      if (query.role) {
        where.role = query.role;
      }

      if (query.branchId) {
        where.branchId = query.branchId;
      }
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
          },
        },
        {
          email: {
            contains: query.search,
          },
        },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      userRepository.list(where, skip, query.limit),
      userRepository.count(where),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async findById(actor: AuthUser, userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'user tidak ditemukan');
    }

    if (actor.role === 'BRANCH_MANAGER') {
      assertCanManageTarget(actor, user);
    }

    return user;
  },

  async update(actor: AuthUser, userId: string, input: UpdateUserInput) {
    const target = await getTargetOrThrow(userId);

    assertCanManageTarget(actor, target);

    if (input.email) {
      await assertEmailAvailable(input.email, userId);
    }

    if (actor.role === 'BRANCH_MANAGER') {
      if (input.role && input.role !== 'CASHIER') {
        throw new AppError(403, 'USER_SCOPE_FORBIDDEN', 'Manager tidak dapat mengubah role kasir');
      }

      if (input.branchId && input.branchId !== actor.branchId) {
        throw new AppError(
          403,
          'USER_SCOPE_FORBIDDEN',
          'Manager tidak dapat memindahkan kasih ke cabang lain',
        );
      }
    }

    const finalRole = input.role ?? target.role;
    const finalBranchId = input.branchId ?? target.branchId;

    if (finalRole === 'BRANCH_MANAGER' || finalRole === 'CASHIER') {
      if (!finalBranchId) {
        throw new AppError(422, 'INVALID_REQUEST', 'Manager dan kasih wajib memiliki branchID');
      }

      await assertBranchExists(finalBranchId);
    }

    return userRepository.update(userId, {
      name: input.name,
      email: input.email,
      role: input.role,
      branch: input.branchId
        ? {
            connect: {
              id: input.branchId,
            },
          }
        : undefined,
    });
  },

  async updateStatus(actor: AuthUser, userId: string, isActive: boolean) {
    const target = await getTargetOrThrow(userId);

    assertCanManageTarget(actor, target);

    return userRepository.update(userId, {
      isActive,
    });
  },

  async updatePassword(actor: AuthUser, userId: string, password: string) {
    const target = await getTargetOrThrow(userId);

    assertCanManageTarget(actor, target);

    const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);

    return userRepository.update(userId, {
      password: passwordHash,
    });
  },
};
