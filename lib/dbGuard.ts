// Central guard against pointing ReturnOps at the wrong database.
//
// ReturnOps runs exclusively on PostgreSQL (a Neon project holding only
// fictional demo data). These checks turn a misconfigured environment into a
// loud, early failure instead of silently reading or — worse — seeding an
// unrelated database. Both the runtime client (`lib/prisma.ts`) and the seed
// script call in here.

const POSTGRES_SCHEMES = ["postgres:", "postgresql:"];

function parsePostgresUrl(raw: string | undefined, context: string): URL {
  if (!raw || raw.trim() === "") {
    throw new Error(
      `${context}: DATABASE_URL is not set. ReturnOps needs a PostgreSQL ` +
        `connection string (see .env.example).`
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `${context}: DATABASE_URL is not a valid URL. Expected a PostgreSQL ` +
        `connection string such as postgresql://user:pass@host/db.`
    );
  }

  if (!POSTGRES_SCHEMES.includes(url.protocol)) {
    throw new Error(
      `${context}: DATABASE_URL must be a PostgreSQL connection string ` +
        `(got "${url.protocol}//..."). ReturnOps no longer supports SQLite.`
    );
  }

  return url;
}

/** Validates the pooled runtime connection string and returns it unchanged. */
export function assertRuntimeDatabaseUrl(raw: string | undefined): string {
  parsePostgresUrl(raw, "ReturnOps runtime");
  return raw as string;
}

/**
 * Stricter check for the destructive seed script: the URL must be PostgreSQL
 * *and* the caller must opt in for anything that isn't an obvious local or
 * Neon demo database, so a stray production URL in the shell can't be wiped by
 * a `db:seed`.
 */
export function assertSeedableDatabaseUrl(raw: string | undefined): string {
  const url = parsePostgresUrl(raw, "ReturnOps seed");

  const host = url.hostname.toLowerCase();
  const looksLikeDemo =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".neon.tech") ||
    host.endsWith(".neon.build");

  if (!looksLikeDemo && process.env.RETURNOPS_SEED_ALLOW_ANY_HOST !== "true") {
    throw new Error(
      `ReturnOps seed refuses to run against "${host}": the seed truncates ` +
        `the Return table before inserting fictional data. If this really is ` +
        `a throwaway demo database, set RETURNOPS_SEED_ALLOW_ANY_HOST=true.`
    );
  }

  return raw as string;
}
