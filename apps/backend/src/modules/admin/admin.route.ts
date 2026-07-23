import { Hono } from 'hono';

import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import type { AppEnv } from '../../types/app-env';

const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', auth, requireRole('SUPER_ADMIN', 'BRANCH_MANAGER'));

adminRoutes.get('/test', (c) => {
  return c.json({
    data: {
      message: 'Anda memiliki akses ke fitur ini karena memiliki peran yang sesuai',
      userId: c.get('userId'),
      role: c.get('role'),
    },
  });
});

export { adminRoutes };
