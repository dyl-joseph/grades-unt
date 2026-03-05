import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use DIRECT_URL (bypasses PgBouncer) since PrismaPg manages its own pool.
  // PgBouncer transaction mode breaks pg's prepared statements.
  const connectionString =
    process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing database connection string. Set DATABASE_URL (and optionally DIRECT_URL)."
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
