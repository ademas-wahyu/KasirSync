import { Hono } from 'hono';
import type { AppEnv } from '../../types/app-env';

const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', (c) => {
  return c.json({
    data: {
      status: 'ok',
      service: 'KasirSync OK',
      timestamp: new Date().toISOString(),
    },
  });
});

export { healthRoutes };
