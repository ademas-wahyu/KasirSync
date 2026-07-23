import { z } from 'zod';

const branchCodeSchema = z
  .string()
  .trim()
  .min(2, 'Kode cabang minimal 2 karakter')
  .max(20, 'Kode cabang maksimal 20 karakter')
  .regex(
    /^[A-Za-z0-9_-]+$/,
    'Kode cabang hanya boleh mengandung huruf, angka, underscore (_), dan tanda hubung (-)',
  )
  .transform((value) => value.toUpperCase());

const branchNameSchema = z
  .string()
  .trim()
  .min(2, 'Nama cabang minimal 2 karakter')
  .max(100, 'Nama cabang maksimal 100 karakter');

const addressSchema = z
  .string()
  .trim()
  .min(2, 'Alamat cabang minimal 2 karakter')
  .max(100, 'Alamat cabang maksimal 100 karakter')
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .max(30, 'Nomor telepon cabang maksimal 30 karakter')
  .nullable()
  .optional();

export const branchIdParamSchema = z.object({
  branchId: z.string().min(1, 'branch ID tidak boleh kosong'),
});

export const createBranchSchema = z.object({
  code: branchCodeSchema,
  name: branchNameSchema,
  address: addressSchema,
  phone: phoneSchema,
});

const addressUpdateSchema = z
  .string()
  .trim()
  .min(2, 'Alamat cabang minimal 2 karakter')
  .max(100, 'Alamat cabang maksimal 100 karakter')
  .nullable()
  .optional();

const phoneUpdateSchema = z
  .string()
  .trim()
  .max(30, 'Nomor telepon cabang maksimal 30 karakter')
  .nullable()
  .optional();

export const updateBranchSchema = z
  .object({
    code: branchCodeSchema.optional(),
    name: branchNameSchema.optional(),
    address: addressUpdateSchema,
    phone: phoneUpdateSchema,
  })
  .refine((value) => Object.keys(value).some((field) => field !== 'undefined'), {
    message: 'Minimal satu field harus diisi',
  });

export const updateBranchStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type UpdateBranchStatusInput = z.infer<typeof updateBranchStatusSchema>;
