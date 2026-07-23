import type { Role } from '../generated/prisma/client';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
};

export type AppEnv = {
  Variables: {
    userId: string;
    role: Role;
  };
};
