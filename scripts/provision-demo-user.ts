// Provisions (or refreshes) the single public portfolio demo account.
//
//   npm run demo:provision
//
// Safe & repeatable:
//   - It only ever upserts ONE row, matched by the unique `DEMO_USER_EMAIL`.
//     No other users, and no `Return` / `AuditLog` records, are read, reset,
//     deleted or overwritten.
//   - It reuses `assertSeedableDatabaseUrl`, so it refuses to run against a
//     database host that isn't `localhost` or `*.neon.tech` unless
//     `RETURNOPS_SEED_ALLOW_ANY_HOST=true` is explicitly set. It performs no
//     migrations and no destructive DDL.
//   - The demo account is always forced to the VIEWER role and an active
//     state, so re-running is the supported way to reset the demo password.
//   - It aborts if an account with that email already exists with a
//     non-VIEWER role — that would be a real account, not the demo login.
//
// Credentials come from server-side env vars only (see `.env.example`); nothing
// secret is printed.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { assertSeedableDatabaseUrl } from "../lib/dbGuard";
import { hashPassword } from "../lib/auth/password";
import { buildDemoUserUpsert } from "../lib/auth/seedAccounts";

async function main() {
  const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD;
  const name = process.env.DEMO_USER_NAME?.trim() || "ReturnOps Demo (viewer)";

  if (!email || !password) {
    throw new Error(
      "DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be set in .env before " +
        "provisioning. Run `npm run auth:init` to generate local values."
    );
  }
  if (password.length < 12) {
    throw new Error("DEMO_USER_PASSWORD must be at least 12 characters.");
  }

  const connectionString = assertSeedableDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && existing.role !== "VIEWER") {
      throw new Error(
        `Refusing to provision: a user with email "${email}" already exists ` +
          `with role ${existing.role}. The demo account must be a dedicated ` +
          `VIEWER — set DEMO_USER_EMAIL to an address that isn't a real account.`
      );
    }

    const passwordHash = await hashPassword(password);
    const { create, update } = buildDemoUserUpsert({ email, name }, passwordHash);

    const user = await prisma.user.upsert({ where: { email }, create, update });

    console.log(
      `${existing ? "Refreshed" : "Created"} demo account: ${user.email} ` +
        `(role ${user.role}, active ${user.isActive}). No other records touched.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
