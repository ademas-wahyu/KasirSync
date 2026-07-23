import { resolveBranchId } from '../../shared/auth/resolve-branch-id';
import { AppError } from '../../shared/errors/app-error';
import type { AppEnv } from '../../types/app-env';
import { branchRepository } from './branch.repository';

import type { CreateBranchInput, UpdateBranchInput } from './branch.schema';

type authUser = AppEnv['Variables']['authUser'];

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('code' in error)) {
    return false;
  }

  return error.code === 'P2002';
}

function ensureSuperAdmin(authUser: authUser): void {
  if (authUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      403,
      'ROLE_FORBIDDEN',
      'Anda tidak memiliki akses untuk melakukan operasi ini',
    );
  }
}

async function ensureBranchExists(branchId: string) {
  const branch = await branchRepository.findById(branchId);

  if (!branch) {
    throw new AppError(404, 'BRANCH_NOT_FOUND', 'Cabang tidak ditemukan');
  }

  return branch;
}

async function ensureCodeAvailable(code: string, excludeBranchId?: string): Promise<void> {
  const existingBranch = await branchRepository.findByCode(code, excludeBranchId);

  if (existingBranch) {
    throw new AppError(409, 'BRANCH_CODE_ALREADY_EXISTS', 'Kode cabang sudah digunakan');
  }
}

export const branchService = {
  async create(authUser: authUser, input: CreateBranchInput) {
    ensureSuperAdmin(authUser);

    const code = input.code.toUpperCase();

    await ensureCodeAvailable(code);

    try {
      return await branchRepository.create({
        ...input,
        code,
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new AppError(409, 'BRANCH_CODE_ALREADY_EXISTS', 'Kode cabang sudah digunakan');
      }
      throw error;
    }
  },

  async list(authUser: authUser) {
    if (authUser.role === 'SUPER_ADMIN') {
      return branchRepository.findAll();
    }

    const branchId = resolveBranchId(authUser);
    const branch = await ensureBranchExists(branchId);

    return [branch];
  },

  async getById(authUser: authUser, requestBranchId: string) {
    const branchId = resolveBranchId(authUser, requestBranchId);

    return ensureBranchExists(branchId);
  },

  async update(authUser: authUser, branchId: string, input: UpdateBranchInput) {
    ensureSuperAdmin(authUser);
    await ensureBranchExists(branchId);

    const updateData: UpdateBranchInput = {
      ...input,
    };

    if (input.code !== undefined) {
      const code = input.code.toUpperCase();

      await ensureCodeAvailable(code, branchId);
      updateData.code = code;
    }

    try {
      return await branchRepository.update(branchId, updateData);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new AppError(409, 'BRANCH_CODE_ALREADY_EXISTS', 'Kode cabang sudah digunakan');
      }
      throw error;
    }
  },

  async updateStatus(authUser: authUser, branchId: string, isActive: boolean) {
    ensureSuperAdmin(authUser);
    await ensureBranchExists(branchId);

    return branchRepository.updateStatus(branchId, isActive);
  },
};
