import 'dotenv/config';
import { z } from 'zod';

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).positive().default(3000),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL environment variable is required'),
  DATABASE_AUTH_TOKEN: optionalString,

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET environment variable must be at least 32 characters long'),

  JWT_EXPIRED_IN: z.enum(['15m', '1h', '8h', '1d', '7d']).default('8h'),

  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL environment variable must be a valid URL')
    .default('http://localhost:5173'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues.map((issue) => {
    const field = issue.path.join('.') || 'environment';

    return `${field}: ${issue.message}`;
  });

  throw new Error(`
    Invalid environment variables:\n${messages.join('\n')}
    `);
}

export const env = result.data;
