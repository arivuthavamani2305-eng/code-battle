import { PrismaClient } from "@prisma/client";

const transientConnectionErrors = new Set(["P1001", "P1002", "P1017", "P2024"]);
const readOperations = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(databaseUrl);

  if (!url.hostname.includes("-pooler.")) {
    throw new Error("DATABASE_URL must use Neon's pooled (-pooler) endpoint");
  }

  const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT ?? 5);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 20) {
    throw new Error("DB_CONNECTION_LIMIT must be an integer between 1 and 20");
  }

  url.searchParams.set("connection_limit", String(connectionLimit));
  url.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT_SECONDS ?? "20");
  url.searchParams.set("connect_timeout", process.env.DB_CONNECT_TIMEOUT_SECONDS ?? "10");

  return url.toString();
}

function isTransientConnectionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    transientConnectionErrors.has(String(error.code))
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  retryMiddlewareConfigured?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    transactionOptions: {
      maxWait: 10_000,
      timeout: 20_000,
    },
  });

if (!globalForPrisma.retryMiddlewareConfigured) {
  prisma.$use(async (params, next) => {
    const maxAttempts = readOperations.has(params.action) ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await next(params);
      } catch (error) {
        if (attempt === maxAttempts || !isTransientConnectionError(error)) {
          throw error;
        }

        await wait(attempt * 150);
      }
    }

    throw new Error("Database operation failed after retrying");
  });
  globalForPrisma.retryMiddlewareConfigured = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
