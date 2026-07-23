import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(6, 'Password harus memiliki minimal 6 karakter')
    .max(72, 'Password tidak boleh lebih dari 72 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;
