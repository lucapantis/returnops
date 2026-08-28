import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { assertRuntimeDatabaseUrl } from "./dbGuard";

// Next.js dev mode reloads modules on every request, which would otherwise
// create a new PrismaClient (and a new connection pool) each time.
// Cache the instance on the global object outside of production.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Pooled Neon connection (PgBouncer). Migrations use DIRECT_URL instead —
  // see prisma.config.ts.
  const connectionString = assertRuntimeDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
