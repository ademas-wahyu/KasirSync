import { Hono } from 'hono';

import { Role } from '../../generated/prisma/client';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import { resolveBranchId } from '../../shared/auth/resolve-branch-id';
import type { AppEnv } from '../../types/app-env';

const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', auth);

adminRoutes.get('/test', requireRole(Role.SUPER_ADMIN, Role.BRANCH_MANAGER), (c) => {
  const authUser = c.get('authUser');

  return c.json({
    data: {
      message: 'Anda memiliki akses ke fitur manajemen',
      authUser,
    },
  });
});

adminRoutes.get(
  '/branches/:branchId/scope-test',
  requireRole(Role.SUPER_ADMIN, Role.BRANCH_MANAGER),
  (c) => {
    const authUser = c.get('authUser');

    const branchId = resolveBranchId(authUser, c.req.param('branchId'));

    return c.json({
      data: {
        message: 'Branch scope valid',
        branchId,
      },
    });
  },
);

export { adminRoutes };
