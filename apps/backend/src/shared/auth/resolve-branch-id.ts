import { Role } from '../../generated/prisma/client';
import type { AuthUser } from '../../types/app-env';

import { AppError } from '../errors/app-error';

type BranchScopeUser = Pick<AuthUser, 'role' | 'branchId'>;

export function resolveBranchId(
  authUser: BranchScopeUser,
  requestedBranchId?: string | null,
): string {
  if (authUser.role === Role.SUPER_ADMIN) {
    if (!requestedBranchId) {
      throw new AppError(422, 'INVALID_REQUEST', 'branchId wajib diisi untuk operasi cabang');
    }

    return requestedBranchId;
  }

  if (!authUser.branchId) {
    throw new AppError(403, 'ROLE_FORBIDDEN', 'User tidak memiliki cabang');
  }

  if (requestedBranchId && requestedBranchId !== authUser.branchId) {
    throw new AppError(403, 'ROLE_FORBIDDEN', 'Akses lintas cabang tidak diizinkan');
  }

  return authUser.branchId;
}
