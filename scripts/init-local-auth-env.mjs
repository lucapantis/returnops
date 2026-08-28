// Ensures the local, git-ignored `.env` has the auth-related variables the app
// and seed need. It ONLY appends variables that are missing — it never rewrites
// or prints an existing value — so it is safe to run repeatedly.
//
//   node scripts/init-local-auth-env.mjs
//
// Generated values (a strong AUTH_SECRET and demo account passwords) are
// written straight to `.env`. Nothing secret is printed to the terminal.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

function strongPassword() {
  // URL-safe, no ambiguous characters; ~144 bits of entropy.
  return randomBytes(18)
    .toString("base64")
    .replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]);
}

const DEFAULTS = {
  AUTH_SECRET: () => randomBytes(32).toString("base64"),
  AUTH_URL: () => "http://localhost:3000",
  SEED_ADMIN_EMAIL: () => "admin@returnops.local",
  SEED_ADMIN_PASSWORD: strongPassword,
  SEED_ADMIN_NAME: () => "ReturnOps Admin",
  SEED_VIEWER_EMAIL: () => "viewer@returnops.local",
  SEED_VIEWER_PASSWORD: strongPassword,
  SEED_VIEWER_NAME: () => "ReturnOps Viewer (demo)",
  // Optional operator account — used by the test suite and normal operations.
  SEED_OPERATOR_EMAIL: () => "operator@returnops.local",
  SEED_OPERATOR_PASSWORD: strongPassword,
  SEED_OPERATOR_NAME: () => "ReturnOps Operator",
  // Public portfolio demo account (VIEWER, read-only, no export). Provisioned
  // by `npm run demo:provision`; the "Try demo" button on the login page shows
  // only when DEMO_USER_EMAIL and DEMO_USER_PASSWORD are both set.
  DEMO_USER_EMAIL: () => "demo@returnops.local",
  DEMO_USER_PASSWORD: strongPassword,
  DEMO_USER_NAME: () => "ReturnOps Demo (viewer)",
};

if (!existsSync(ENV_PATH)) {
  writeFileSync(ENV_PATH, "");
  console.log("Created empty .env");
}

const existing = readFileSync(ENV_PATH, "utf8");
const definedKeys = new Set(
  existing
    .split("\n")
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=/))
    .filter(Boolean)
    .map((m) => m[1])
);

const toAppend = [];
for (const [key, make] of Object.entries(DEFAULTS)) {
  if (definedKeys.has(key)) continue;
  const value = make();
  const needsQuotes = /[\s"#]/.test(value);
  toAppend.push(`${key}=${needsQuotes ? JSON.stringify(value) : value}`);
}

if (toAppend.length === 0) {
  console.log("All auth env variables are already present in .env — nothing to do.");
  process.exit(0);
}

const block =
  (existing.endsWith("\n") || existing === "" ? "" : "\n") +
  "\n# --- Authentication (added by scripts/init-local-auth-env.mjs) ---\n" +
  toAppend.join("\n") +
  "\n";

appendFileSync(ENV_PATH, block);

console.log(`Added ${toAppend.length} variable(s) to .env:`);
for (const line of toAppend) console.log(`  ${line.split("=")[0]}`);
console.log(
  "\nValues were written to .env (git-ignored). Run `npm run db:seed` to create the accounts."
);
