import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePostgresConnectionString } from "@/lib/prisma-connection";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use pooler URL in production (Vercel serverless), direct URL in dev
  const connectionString =
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL
      : process.env.DIRECT_URL || process.env.DATABASE_URL;

  const adapter = new PrismaPg({
    connectionString: normalizePostgresConnectionString(connectionString ?? ""),
    // Supabase's managed Postgres connection presents a certificate chain
    // that Node rejects by default in local/prod-preview runs. Keep TLS on
    // but disable strict certificate validation so Prisma can connect.
    ssl: { rejectUnauthorized: false },
  });
  
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
