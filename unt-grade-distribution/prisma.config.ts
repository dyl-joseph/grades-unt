import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load .env from the project root so the Prisma CLI can resolve vars
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL,
  },
});
