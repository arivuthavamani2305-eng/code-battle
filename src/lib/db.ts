import { PrismaClient } from "@prisma/client";

// Prevent creating a new PrismaClient on every hot-reload in dev,
// and keep a single pooled connection in serverless production.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
