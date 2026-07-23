import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import type { AppEnv } from '../../types/app-env';
import {
  branchIdParamSchema,
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
} from './branch.schema';
import { branchService } from './branch.service';

export const branchRoutes = new Hono<AppEnv>();

branchRoutes.use('*', auth);

branchRoutes.post(
  '/',
  requireRole('SUPER_ADMIN'),
  zValidator('json', createBranchSchema),
  async (c) => {
    const authUser = c.get('authUser');
    const input = c.req.valid('json');

    const branch = await branchService.create(authUser, input);

    return c.json(
      {
        data: {
          branch,
        },
      },
      201,
    );
  },
);

branchRoutes.get('/', requireRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'), async (c) => {
  const authUser = c.get('authUser');
  const branches = await branchService.list(authUser);

  return c.json({
    data: {
      branches,
    },
  });
});

branchRoutes.get(
  '/:branchId',
  requireRole('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'),
  zValidator('param', branchIdParamSchema),
  async (c) => {
    const authUser = c.get('authUser');
    const { branchId } = c.req.valid('param');

    const branch = await branchService.getById(authUser, branchId);

    return c.json({
      data: {
        branch,
      },
    });
  },
);

branchRoutes.patch(
  '/:branchId',
  requireRole('SUPER_ADMIN'),
  zValidator('param', branchIdParamSchema),
  zValidator('json', updateBranchSchema),
  async (c) => {
    const authUser = c.get('authUser');
    const { branchId } = c.req.valid('param');
    const input = c.req.valid('json');

    const branch = await branchService.update(authUser, branchId, input);

    return c.json({
      data: {
        branch,
      },
    });
  },
);

branchRoutes.patch(
  '/:branchId/status',
  requireRole('SUPER_ADMIN'),
  zValidator('param', branchIdParamSchema),
  zValidator('json', updateBranchStatusSchema),
  async (c) => {
    const authUser = c.get('authUser');
    const { branchId } = c.req.valid('param');
    const { isActive } = c.req.valid('json');

    const branch = await branchService.updateStatus(authUser, branchId, isActive);

    return c.json({
      data: {
        branch,
      },
    });
  },
);
