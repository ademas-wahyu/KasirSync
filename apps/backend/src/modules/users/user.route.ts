import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../types/app-env';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './user.schema';
import { userService } from './user.service';

export const userRoutes = new Hono<AppEnv>();

userRoutes.use('*', auth);
userRoutes.use('*', requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'));

userRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const actor = c.get('authUser');
  const input = c.req.valid('json');

  const user = await userService.create(actor, input);

  return c.json({ data: user }, 201);
});

userRoutes.get('/', zValidator('query', listUsersQuerySchema), async (c) => {
  const actor = c.get('authUser');
  const query = c.req.valid('query');

  const result = await userService.list(actor, query);

  return c.json({ data: result });
});

userRoutes.get('/:userId', zValidator('param', userIdParamSchema), async (c) => {
  const actor = c.get('authUser');
  const { userId } = c.req.valid('param');

  const user = await userService.findById(actor, userId);

  return c.json({ data: user });
});

userRoutes.patch(
  '/:userId',
  zValidator('param', userIdParamSchema),
  zValidator('json', updateUserSchema),
  async (c) => {
    const actor = c.get('authUser');
    const { userId } = c.req.valid('param');
    const input = c.req.valid('json');

    const user = await userService.update(actor, userId, input);

    return c.json({ data: user });
  },
);

userRoutes.patch(
  '/:userId/status',
  zValidator('param', userIdParamSchema),
  zValidator('json', updateUserStatusSchema),
  async (c) => {
    const actor = c.get('authUser');
    const { userId } = c.req.valid('param');
    const { isActive } = c.req.valid('json');

    const user = await userService.updateStatus(actor, userId, isActive);

    return c.json({ data: user });
  },
);

userRoutes.patch(
  '/:userId/password',
  zValidator('param', userIdParamSchema),
  zValidator('json', updateUserPasswordSchema),
  async (c) => {
    const actor = c.get('authUser');
    const { userId } = c.req.valid('param');
    const { password } = c.req.valid('json');

    const user = await userService.updatePassword(actor, userId, password);

    return c.json({ data: user });
  },
);
