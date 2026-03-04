import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // In production (Vercel), always use pooler URL for serverless compatibility
  // In dev, prefer direct URL for speed if available
  const connectionString =
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL
      : process.env.DIRECT_URL || process.env.DATABASE_URL;

  const adapter = new PrismaPg({
    connectionString,
    pool: {
      max: 5,                    // Keep low for serverless (PgBouncer free tier = 20 slots)
      idleTimeoutMillis: 30000,  // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
    },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
