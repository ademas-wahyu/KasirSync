import { z } from 'zod';

const managedRoleSchema = z.enum(['BRANCH_MANAGER', 'CASHIER']);

const normalizedEmailSchema = z
  .email('Format yang dimasukan tidak valid')
  .transform((value) => value.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter');

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: normalizedEmailSchema,
  password: passwordSchema,
  role: managedRoleSchema,
  branchId: z.string().min(1, 'branchId tidak valid'),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: normalizedEmailSchema.optional(),
    role: managedRoleSchema.optional(),
    branchId: z.string().min(1, 'branchId tidak valid').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal ada satu field yang diupdate',
  });

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserPasswordSchema = z.object({
  password: passwordSchema,
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'userId tidak valid'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: managedRoleSchema.optional(),
  branchId: z.string().min(1).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
