import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "../config/env";

const adapter = new PrismaLibSql({
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN
        ? { authToken: env.DATABASE_AUTH_TOKEN }
        : {}),
});

export const prisma = new PrismaClient({
    adapter,
})