# ReturnOps

ReturnOps is a returns and operational-record management system: a
dashboard for logging, tracking and reporting on product returns through a
fixed inspection-and-resolution workflow. It's an MVP built with fully
fictional demo data — no real company, customer or order information is used
anywhere in the codebase or seed data. It runs on a hosted
[Neon](https://neon.tech) PostgreSQL database.

Access is gated by credentials authentication (Auth.js) with three roles —
`ADMIN`, `OPERATOR`, `VIEWER` — and every recorded mutation is written to an
append-only audit log. See [Authentication, roles & audit](#authentication-roles--audit).

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS 4** for styling
- **Prisma 7** ORM on **PostgreSQL** (Neon), via the `@prisma/adapter-pg`
  driver adapter over the `pg` driver (Prisma 7 no longer ships a bundled
  query engine — see [Architecture decisions](#architecture-decisions))
- **Zod 4** for all input validation (API bodies, forms, CSV rows) from a
  single shared schema module
- **Recharts** for the dashboard visualizations
- **Auth.js** (NextAuth v5, credentials provider, JWT sessions) for
  authentication, with **bcryptjs** password hashing
- **Vitest** for unit tests, **Playwright** for end-to-end tests
- A hand-rolled RFC4180 CSV parser/serializer (no external CSV dependency)

## Getting started

Requirements: Node.js 20+ and a PostgreSQL database. The project is developed
against [Neon](https://neon.tech); any PostgreSQL 14+ instance works.

```bash
npm install

# Copy the environment template and fill in your connection strings
cp .env.example .env
#   DATABASE_URL  — pooled connection, used by the app at runtime
#   DIRECT_URL    — direct (unpooled) connection, used by Prisma migrations

# Generate the local auth secrets & demo-account passwords into .env
# (only fills in variables that are missing; never prints or overwrites values)
npm run auth:init

# Apply the PostgreSQL migrations to your database
npm run db:migrate

# Seed it with 72 fictional return records + the ADMIN / VIEWER / OPERATOR accounts
npm run db:seed

# Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and sign in. The
account emails default to `admin@returnops.local`, `operator@returnops.local`
and `viewer@returnops.local`; the passwords are in your git-ignored `.env`
(written by `npm run auth:init`). The dashboard, returns list and charts are
populated from the seed data immediately.

The seed is safe to re-run at any time — it replaces the `Return` table
contents inside a single transaction with the same deterministic dataset, and
refuses to run against a database host that isn't `localhost` or `*.neon.tech`
unless `RETURNOPS_SEED_ALLOW_ANY_HOST=true` is set.

To create a **new** migration after changing `prisma/schema.prisma`, use
`npm run db:migrate:dev` (wraps `prisma migrate dev`, which needs a shadow
database — see [Architecture decisions](#architecture-decisions)).

## Available scripts

| Script                | What it does                                         |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server                          |
| `npm run build`        | Production build (also type-checks via `next build`)  |
| `npm run start`        | Serve the production build                             |
| `npm run lint`         | ESLint                                                 |
| `npm run typecheck`    | `tsc --noEmit`                                         |
| `npm run test`         | Run unit tests once (Vitest)                           |
| `npm run test:watch`   | Unit tests in watch mode                               |
| `npm run e2e`          | Playwright end-to-end tests (spins up the dev server)  |
| `npm run db:migrate`     | Apply pending migrations (`prisma migrate deploy`)   |
| `npm run db:migrate:dev` | Create + apply a new migration (`prisma migrate dev`)|
| `npm run db:seed`        | Seed the database (`prisma db seed`)                 |
| `npm run db:reset`       | Drop, re-migrate and re-seed the database (destructive) |
| `npm run auth:init`      | Write missing auth env vars into `.env` (secret + demo passwords) |
| `npm run demo:provision` | Upsert **only** the public portfolio demo VIEWER account (safe, non-destructive) |

## Features

### Dashboard (`/`)

- Total returns, open/in-progress count, completed count, and average
  processing time (received → completed, in days) across completed returns
- Bar chart of returns by workflow status
- Bar chart of the most common return reasons, ranked by volume
- Empty and error states when there's no data or the database isn't reachable

### Returns list (`/returns`)

- Server-rendered, paginated table (10 per page) of all return records
- Free-text search across return reference, order number, product name and
  customer name
- Filters by status, reason, and received-date range, all reflected in the
  URL (`?search=...&status=...&reason=...&dateFrom=...&dateTo=...&page=...`)
  so filtered views are shareable/bookmarkable and survive a refresh
- CSV export of the **currently filtered** view (`/api/returns/export`)

### Create / view / edit a return

- **New return** (`/returns/new`) — a validated form; the return reference
  (`RET-<year>-<sequence>`) is generated automatically
- **Return detail** (`/returns/[id]`) — full record detail plus a workflow
  panel showing only the statuses it's legal to move to next
- **Edit** (`/returns/[id]/edit`) — same form pre-filled, updates in place

### Status workflow

Returns move through a fixed 5-stage workflow. `RECEIVED` and `INSPECTING`
are the intake/triage stages; `APPROVED`/`REJECTED` is the decision point;
`COMPLETED` is terminal.

```
RECEIVED → INSPECTING → APPROVED → COMPLETED
                      ↘ REJECTED  → COMPLETED
              (APPROVED can revert to INSPECTING if re-examination is needed)
```

Both the API (`PATCH /api/returns/[id]`) and the UI reject any transition not
in this table. Moving a record into `COMPLETED` auto-stamps `completedDate`
if one isn't supplied; moving it back out of a terminal state clears it.

### CSV import (`/returns/import`)

A three-step wizard:

1. **Upload** — drag-and-drop or choose a `.csv` file (a template with the
   expected columns can be downloaded from the same page)
2. **Preview** — every row is validated against the same Zod schema used
   everywhere else; the preview reports, per row, whether it's ready to
   import, invalid (with the specific field errors), or a duplicate (either
   against an existing database record or another row earlier in the same
   file, matched by return reference and by order-number+SKU)
3. **Commit** — only valid, non-duplicate rows are inserted, in a single
   transaction; the server re-validates from scratch at commit time rather
   than trusting the client-held preview, in case the database changed in
   between

Required columns: `returnRef, orderNumber, productName, sku, customerName,
reason, status, receivedDate`. Optional: `completedDate, operatorNotes`.

Imports are capped at 5,000 rows / 5 MB per file. On export, any cell whose
value begins with a spreadsheet formula trigger (`= + - @`, tab, CR) is
prefixed with a single quote so a return record can't smuggle a formula into
a downstream spreadsheet (CSV injection).

## Authentication, roles & audit

### Authentication

- **Auth.js (NextAuth v5)** with a single **Credentials** provider. There is
  no public registration, password recovery or OAuth — by design.
- Users live in the `User` table. Passwords are stored **only** as a bcrypt
  hash (work factor 12); plaintext is never persisted or logged.
- Sessions are **stateless JWTs** in an `HttpOnly`, `SameSite=Lax`,
  `Secure`-in-production cookie, signed with `AUTH_SECRET`. This suits a
  serverless deployment (no session table to read on every request).
- **Generic login errors.** A wrong password, an unknown email, a disabled
  account and a locked account all return the same "Invalid email or
  password." message, and a bcrypt comparison runs on every path so response
  time doesn't reveal whether an account exists.
- **Brute-force protection that works in serverless.** Failed attempts are
  counted on the `User` row; after 5 consecutive failures the account is
  locked for 15 minutes. A successful login clears the counter. No in-memory
  state, so it holds across cold starts and multiple instances.

### Roles & permission matrix

Authorization is **default-deny**: a permission is granted only if the role is
explicitly listed for it in `lib/auth/permissions.ts`.

| Capability | VIEWER | OPERATOR | ADMIN |
| --- | :---: | :---: | :---: |
| Dashboard, return list & detail, search, filters | ✅ | ✅ | ✅ |
| CSV **export** of the filtered view | ✅ | ✅ | ✅ |
| Create returns | — | ✅ | ✅ |
| Edit returns | — | ✅ | ✅ |
| Legal status transitions | — | ✅ | ✅ |
| CSV **import** | — | ✅ | ✅ |
| Audit log (page + API) | — | — | ✅ |
| Any mutation not listed | — | — | — |

The **public portfolio demo account** is a VIEWER with an even narrower grant
(`DEMO_PERMISSIONS` in `lib/auth/permissions.ts` — `returns:read` only): it can
browse the fictional dashboard, list and detail views but **cannot export CSV,
run any mutation, or reach the audit trail**. A demo session is also clamped to
the VIEWER role in `lib/auth/guard.ts` regardless of the database row. See
[Public portfolio demo](#public-portfolio-demo).

### Where enforcement happens

1. **`proxy.ts`** (Next.js 16's renamed Middleware) — an *optimistic*,
   cookie-only check that redirects unauthenticated page requests to `/login`
   and returns `401` for unauthenticated API calls. It never touches the
   database and is **not** the only line of defence.
2. **Every page** re-verifies the session (`requireUser` /
   `requirePermission` in `lib/auth/guard.ts`); unauthorized users are sent to
   `/login` or `/forbidden`.
3. **Every API route and server mutation** independently calls `guard()`,
   which returns a real `401` / `403`. Most reads check the session claim;
   every mutation **and the audit trail** (`/audit` page + `GET /api/audit`)
   pass `{ fresh: true }` to **re-load the user from the database** first, so a
   revoked role or a disabled account takes effect on the next request even if
   the session cookie is still valid.
4. **UI actions** the current role can't perform are hidden (buttons, nav
   links, the workflow panel), but that is cosmetic — the server checks stand
   on their own. This is verified by e2e tests that call the API directly with
   a VIEWER cookie and assert `403`.

### Audit log

- Append-only `AuditLog` table: `actorId` / `actorEmail` / `actorRole`,
  `action`, `entityType`, `entityId`, redacted `metadata`, `createdAt`.
- The migrations install Postgres triggers that **reject `UPDATE`, `DELETE`
  and `TRUNCATE`** on the table, so the trail can't be rewritten or wiped by
  any code path.
- Successful **create**, **edit**, **status-change** and **CSV-import**
  mutations each write one row, in the **same transaction** as the business
  change (they commit or roll back together).
- `metadata` is passed through `redactMetadata`: keys that look like secrets
  (`pass`, `secret`, `token`, `hash`, `csv`, …) are dropped, long strings are
  truncated and large arrays capped — so passwords, tokens and raw CSV
  payloads never land in the trail. CSV imports record counts and the created
  return references only.
- `/audit` (ADMIN only) offers filtering by actor, action, entity id and date
  range, with pagination.

### Accounts created by the seed

| Role | Default email | Purpose |
| --- | --- | --- |
| `ADMIN` | `admin@returnops.local` | Full access incl. the audit log |
| `OPERATOR` | `operator@returnops.local` | Mutations, no audit access (optional — created only if `SEED_OPERATOR_*` is set) |
| `VIEWER` | `viewer@returnops.local` | Read-only access (browse + CSV export) |

Credentials come from environment variables (see below) and exist only in the
git-ignored `.env`. The seed **upserts** these accounts and never touches any
other user, so it stays safe to re-run. For an account that already exists it
refreshes only the display name and role — it will **not** reset the password
or re-enable a disabled account. Set `SEED_RESET_CREDENTIALS=true` to force the
password and active flag back to the `.env` baseline when rotating the demo
credentials.

### Public portfolio demo

For a safe public demo, the login page shows a **"Try demo"** button beside the
normal sign-in form. It appears **only** when both `DEMO_USER_EMAIL` and
`DEMO_USER_PASSWORD` are set on the server; the normal login flow is untouched.

- **Credentials stay server-side.** The button's action (`demoLoginAction` in
  `app/login/actions.ts`) reads `DEMO_USER_*` from `process.env` and hands them
  straight to Auth.js. Nothing is exposed via `NEXT_PUBLIC_*`, the client
  bundle, logs or committed files — `.env.example` carries placeholders only.
- **Always a VIEWER, and less.** The account is identified by its email
  matching `DEMO_USER_EMAIL` (`lib/auth/demo.ts`). Every session for it is
  forced to the VIEWER role and flagged `isDemo`, which narrows `can()` to
  `DEMO_PERMISSIONS` (`returns:read`). So the demo account **cannot** create,
  edit, import, export, change statuses, or open the audit log — enforced by
  the same `guard()` / `requirePermission()` layer as every other role, and
  covered by unit tests (`lib/auth/guard.test.ts`, `permissions.test.ts`) plus
  an e2e spec (`e2e/demo.spec.ts`).
- **Fictional data only.** ReturnOps contains nothing but fictional demo data
  (`prisma/seed.ts`); the demo account is read-only on top of that.

**Provisioning** (run against a local or Neon demo database — never production):

```bash
npm run auth:init        # writes DEMO_USER_* into the git-ignored .env
npm run demo:provision   # upserts ONLY the demo VIEWER row
```

`npm run demo:provision` (`scripts/provision-demo-user.ts`) upserts the single
account matched by `DEMO_USER_EMAIL`. It runs no migrations, seeds no returns,
and never deletes, resets or overwrites any other record. It re-uses the
`lib/dbGuard.ts` host check, so it refuses any database host that isn't
`localhost` / `*.neon.tech` unless `RETURNOPS_SEED_ALLOW_ANY_HOST=true`. It also
aborts if an account with that email already exists with a non-VIEWER role.
Re-running it is the supported way to rotate the demo password.

On the deployment, set `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` (and
optionally `DEMO_USER_NAME`) as environment variables, then run the provisioning
command once against the demo database from a trusted machine.

### Environment variables

Runtime / build:

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (app runtime) |
| `DIRECT_URL` | Direct Postgres connection (Prisma CLI / migrations) |
| `AUTH_SECRET` | Signs the session JWT — **required**. `openssl rand -base64 32` |
| `AUTH_URL` | Canonical app URL (`https://<your-app>` on Vercel) |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` | Enable the "Try demo" button. Both must be set for it to appear. Server-side only — never `NEXT_PUBLIC_*`. |
| `DEMO_USER_NAME` | Optional display name for the demo account (default `ReturnOps Demo (viewer)`) |

Seed / provisioning-only (not needed at runtime, apart from the two `DEMO_*`
above which gate the login button):

| Name | Purpose |
| --- | --- |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | ADMIN account |
| `SEED_VIEWER_EMAIL`, `SEED_VIEWER_PASSWORD`, `SEED_VIEWER_NAME` | VIEWER account |
| `SEED_OPERATOR_EMAIL`, `SEED_OPERATOR_PASSWORD`, `SEED_OPERATOR_NAME` | OPERATOR account (optional) |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_USER_NAME` | Public portfolio demo VIEWER — used by `npm run demo:provision` |

Placeholders for all of these are in `.env.example`. **Only `DATABASE_URL`,
`DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` and (for the demo button)
`DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` need to be set on the deployment** —
the `SEED_*` variables are used only when seeding a database.

## Architecture decisions

- **Enums as `TEXT`.** `status` and `reason` are stored as plain `text`
  columns (not PostgreSQL `enum` types) and validated exclusively at the
  application boundary via the Zod schemas in `lib/validation.ts` — the
  single source of truth reused by the create/edit API routes, the CSV
  import pipeline, and the forms. This keeps adding a new status/reason a
  code-only change with no migration, and matches the original SQLite model.
- **Prisma 7 driver adapters.** Prisma 7 removed the bundled Rust query
  engine; `PrismaClient` is constructed with an explicit `@prisma/adapter-pg`
  adapter over the `pg` driver (`lib/prisma.ts`), and the datasource URL
  lives in `prisma.config.ts` rather than `schema.prisma` (schema-embedded
  datasource URLs are no longer supported).
- **Pooled runtime, direct migrations.** The app runtime connects through
  Neon's pooled (PgBouncer) endpoint via `DATABASE_URL`. Prisma Migrate and
  the other CLI commands need session-level features the pooler can't
  provide, so `prisma.config.ts` points them at the direct, unpooled
  `DIRECT_URL` instead. Prisma 7's config `datasource` block only exposes
  `url` (there is no `directUrl` field), which is fine here because that
  block is *only* read by the CLI — the runtime never loads it.
- **Migration history reset for the provider switch.** ReturnOps started on
  SQLite. The single SQLite `init` migration contained SQLite-only DDL
  (`DATETIME`, inline `PRIMARY KEY`, no `CREATE SCHEMA`) that PostgreSQL
  cannot execute, so keeping it would have permanently broken
  `prisma migrate deploy`. Because no PostgreSQL database had ever applied
  it, the old migration was deleted outright and replaced with a single
  fresh PostgreSQL baseline (`prisma/migrations/*_init/`, generated with
  `prisma migrate diff --from-empty --to-schema`), and `migration_lock.toml`
  was switched to `postgresql`. There is no data to migrate — every
  environment is seeded from `prisma/seed.ts`.
- **`prisma migrate deploy` as the default.** `npm run db:migrate` runs
  `migrate deploy`, which applies committed migrations without needing a
  shadow database — the right choice for a hosted Neon database. Creating
  *new* migrations (`npm run db:migrate:dev` → `prisma migrate dev`) still
  needs a shadow database; Neon supports this, or point
  `datasource.shadowDatabaseUrl` in `prisma.config.ts` at a scratch database.
- **Case-insensitive search preserved.** SQLite's `LIKE` is
  case-insensitive for ASCII by default; PostgreSQL's is not. The returns
  search in `lib/returnsQuery.ts` sets Prisma's `mode: "insensitive"` on
  each clause so search behaves exactly as it did on SQLite.
- **Wrong-database guard.** `lib/dbGuard.ts` fails fast if `DATABASE_URL`
  is missing or non-PostgreSQL, and the seed additionally refuses hosts that
  aren't `localhost`/`*.neon.tech` without an explicit opt-in — so a stray
  connection string in the shell can't be read from or wiped by accident.
- **Shared query logic, no internal HTTP hop.** The returns list *page*
  (a Server Component) and the `GET /api/returns` *endpoint* both call the
  same `listReturns()`/`buildReturnsWhere()` helpers in
  `lib/returnsQuery.ts` directly against Prisma, rather than the page
  fetching its own API route over HTTP.
- **URL-driven table state.** Search, filters, sort and pagination all live
  in the URL query string; the filter bar is a small client component that
  only manipulates `useSearchParams`/`router.push`, and the actual data
  fetch happens server-side on the resulting request.
- **No CSV library.** The import/export format is a flat, single-record-
  per-row shape; `lib/csv.ts` implements just enough RFC4180 (quoted fields,
  embedded commas/quotes/newlines) to handle it correctly without pulling in
  a dependency for it.
- **Deterministic seed data.** `prisma/seed.ts` uses a seeded PRNG
  (mulberry32) so the fictional dataset is realistic-looking (skewed status
  distribution, weighted reasons, varied processing times) but reproducible
  across runs.
- **Credentials auth, JWT sessions, no adapter.** Auth.js runs with the
  Credentials provider and the default JWT session strategy — no Prisma
  adapter and no session table, which keeps every request a single cookie
  verification with no database round-trip. The trade-off (a session can
  outlive a role change) is handled by re-loading the user from the database
  for every sensitive mutation (`guard(..., { fresh: true })`).
- **Split auth config for the proxy.** `auth.config.ts` holds the
  database-free configuration; `proxy.ts` builds its own `NextAuth` instance
  from just that object, so the optimistic middleware check never imports
  Prisma or bcrypt. The full provider (with `authorize`) lives in `auth.ts`,
  used by route handlers and Server Components.
- **Append-only audit at the database.** Beyond only ever calling
  `auditLog.create`, the migration adds a trigger that raises on `UPDATE` /
  `DELETE`, so the trail is tamper-evident regardless of application bugs.
- **Migrations generated with `migrate diff`.** As with the PostgreSQL
  baseline, the auth migration was produced with
  `prisma migrate diff --from-config-datasource --to-schema … --script` and
  applied with `prisma migrate deploy` (no shadow database, non-destructive),
  then hand-extended with the audit trigger DDL.

## Testing

```bash
npm run test        # unit tests: validation, CSV, metrics, permissions,
                     # password hashing, lockout logic, audit redaction
npm run e2e          # Playwright: auth + RBAC + audit + critical flow, against
                     # a real dev server + DB, on desktop and mobile (Pixel 7)
```

Unit tests cover the pure logic in `lib/` (Zod schemas, CSV parse/serialize,
import row validation/deduplication, metrics aggregation, status-transition
rules, the **permission matrix**, the **`guard()` authorization logic**
(including the `{ fresh: true }` database re-check), **password hashing**, the
**lockout** state machine, **callback-URL open-redirect sanitisation**, the
**seed account upsert** rules and **audit metadata redaction**) without
touching the database, so `npm run test` never connects to PostgreSQL.

The Playwright suite (`e2e/auth.spec.ts` + `e2e/critical-flow.spec.ts`)
exercises the whole stack end to end and covers:

- valid / invalid login and the generic (non-enumerating) error
- unauthenticated page redirects and `401` API responses
- a forged session cookie treated as no session
- an off-site `callbackUrl` (`https://…`, `//host`, `/\host`) cannot bounce the
  user off-origin after login
- VIEWER: mutation UI hidden, mutation pages `→ /forbidden`, and **direct API
  calls rejected with `403`** (create, edit, status-change, import, audit)
- OPERATOR: full create / edit / legal-transition / import workflow, illegal
  transitions rejected `400`, audit access denied
- ADMIN: audit page + API, filtering, and that the OPERATOR mutations above
  produced audit rows with no raw CSV content
- logout ending the session

It needs the seeded accounts, so run `npm run auth:init && npm run db:seed`
first, and point `.env` at a disposable database (never a shared or
production one). The suite generates a unique record suffix per run, so it is
safe to re-run.

## Known limitations

- `npm audit` reports vulnerabilities in `deepmerge-ts`, a transitive
  dev-only dependency pulled in by `@prisma/config`. It has no runtime
  exposure (it's not part of the built app) and there's no non-breaking fix
  available at the current Prisma 7.10.x line.
- `pg` prints a one-time `SECURITY WARNING` on startup because the Neon
  connection strings use `sslmode=require`, which upcoming `pg` v9 will
  reinterpret. Current behaviour (treated as `verify-full`) is the stricter,
  correct one for Neon; the warning is cosmetic and clears once the
  connection strings are updated to `sslmode=verify-full`.
- No optimistic concurrency control on edits — a "last write wins" model is
  fine for a single-user local MVP but wouldn't be for concurrent multi-user
  use. A concurrent create that loses a `returnRef` race is surfaced as a
  clean `409`, not a crash.
- CSV import is capped at 5,000 rows / 5 MB per file (`lib/importDb.ts`) to
  keep a single import within one database transaction.
- CSV export is capped at 20,000 rows.
- The dashboard charts are rendered with Recharts (SVG) and are not fully
  screen-reader accessible; the same figures are shown as data labels on
  every bar.
- **Auth known limitations:**
  - Brute-force lockout is **per account**, not per IP — appropriate for a
    small fixed set of internal users with no public registration to
    enumerate, but it does not stop a distributed attack spread across many
    accounts, and an attacker who knows an email can lock that user out for
    15 minutes (a deliberate trade-off).
  - No password rotation, expiry, complexity policy (beyond a 12-char seed
    minimum), MFA, or "log out all devices" — out of scope per the brief.
  - JWT sessions can't be revoked centrally before they expire. Every mutation
    and the audit trail re-check the database, so a downgraded or disabled
    account loses write access and audit access on its next request; but a
    stale session can still *read* ordinary returns data (list, detail,
    metrics, export) for the remainder of its lifetime. Reducing the session
    `maxAge` is the lever if that matters.
  - The failed-login counter is written on the wrong-password path but not on
    the "no such user" path, so a real account's failed login is marginally
    slower than an unknown email's. bcrypt dominates the response time, so this
    is not a practical enumeration oracle for an internal tool with no public
    sign-up.
  - The audit log records mutations only (not reads or logins) and keeps a
    single batch row per CSV import rather than one per imported record.
  - Account management (create/disable/change-role) is done via the seed or
    direct database access — there is no admin user-management UI.
  - `next-auth` is on its v5 **beta** line (the only channel with Next.js 16
    support); it is stable in practice but not yet a final release.

## Project structure

```
auth.ts                 Auth.js instance (Credentials provider, authorize logic)
auth.config.ts          DB-free Auth.js config shared with the proxy
proxy.ts                Next.js 16 Proxy (optimistic route protection)
app/                    Routes (App Router)
  page.tsx              Dashboard
  login/                 Login page + sign-in / sign-out server actions
  forbidden/             403 state for authenticated-but-not-permitted users
  audit/                 ADMIN-only audit log (filters + pagination)
  returns/               Returns list, new/edit/detail, import wizard
  api/auth/              Auth.js endpoints ([...nextauth])
  api/returns/           REST endpoints (list/create, get/patch, export, import)
  api/metrics/           Dashboard metrics endpoint
  api/audit/             Audit log query endpoint (ADMIN only)
components/
  dashboard/             Chart + stat card components
  returns/               Table, filters, pagination, form, workflow actions
  import/                CSV import wizard
  audit/                 Audit table + filter bar
  layout/                App shell, nav, user menu
  ui/                    Shared primitives (Button, Badge, PageHeader, empty/error states)
lib/                    Framework-agnostic logic: validation, CSV, import,
                        metrics, Prisma client, query builders — all unit-tested
  auth/                  Permission matrix, password hashing, lockout, guards
  audit.ts               Audit writer + metadata redaction
scripts/                init-local-auth-env.mjs (generate .env auth values)
prisma/                 Schema, migrations, seed script
e2e/                    Playwright end-to-end tests (auth + RBAC + critical flow)
```
