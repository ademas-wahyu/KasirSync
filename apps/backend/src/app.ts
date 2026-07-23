import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { env } from './config/env';
import type { AppEnv } from './types/app-env';

import { authRoutes } from './modules/auth/auth.route';
import { adminRoutes } from './modules/admin/admin.route';
import { healthRoutes } from './modules/health/health.route';

import { branchRoutes } from './modules/branch/branch.route';

import { errorHandler, notFoundHandler } from './shared/http/handlers';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('*', secureHeaders());

app.use(
  '/api/*',
  cors({
    origin: env.FRONTEND_URL,

    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],

    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    credentials: false,
    maxAge: 600,
  }),
);

app.get('/', (c) => {
  return c.json({
    data: {
      name: 'KasirSync API',
      version: 'v1',
      status: 'running',
    },
  });
});

app.route('/api/v1/health', healthRoutes);
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/admin', adminRoutes);

app.route('/api/v1/branches', branchRoutes);

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
