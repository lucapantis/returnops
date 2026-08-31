# ReturnOps

**ReturnOps is an internal operations tool for managing product returns** — a
single place for a small operations team to log every return, move it through a
fixed inspection-and-resolution workflow, and report on what is coming back and
why.

> **Portfolio note.** This is a self-contained MVP built to demonstrate
> full-stack engineering practice: type-safe data flow, role-based access
> control, an append-only audit trail, and a production deployment. Every
> record is **fictional demo data** — no real company, customer, or order
> information appears anywhere in the code or the seed script.

**Live demo:** <https://returnops-five.vercel.app>

![ReturnOps dashboard on desktop](docs/screenshots/desktop-dashboard.png)

---

## The business problem

A retailer receiving returns by post has the same questions every week:

- Which returns are sitting in the queue, and how long have they been there?
- Why are customers sending things back — is one product driving the volume?
- How long does it actually take us to process a return end to end?
- Who changed this record, and when?

Without a system, that lives in a spreadsheet: no validation, no workflow, no
history of who did what, and no safe way to give a colleague read-only access.
ReturnOps replaces that spreadsheet with a small web app that enforces the
workflow, validates every entry against one shared schema, keeps a tamper-proof
audit log of every change, and separates "can look" from "can edit" from "can
see the audit trail".

---

## Try the demo

Open <https://returnops-five.vercel.app> and click **"Try demo"** on the login
screen — no sign-up, no credentials to enter.

The demo signs you in as a **locked-down read-only account**. You can browse the
dashboard, open the returns list, use search and filters, and view any return in
detail. Creating, editing, importing, CSV export, and the audit log are all
disabled for the demo account — enforced on the server, not just hidden in the
UI (see [Authentication, authorization & demo security](#authentication-authorization--demo-security)).

| View | Screenshot |
| --- | --- |
| Dashboard (desktop) | [`docs/screenshots/desktop-dashboard.png`](docs/screenshots/desktop-dashboard.png) |
| Returns list | [`docs/screenshots/returns-list.png`](docs/screenshots/returns-list.png) |
| Return detail | [`docs/screenshots/return-detail.png`](docs/screenshots/return-detail.png) |
| Dashboard (mobile) | [`docs/screenshots/mobile-dashboard.png`](docs/screenshots/mobile-dashboard.png) |

<p>
  <img src="docs/screenshots/returns-list.png" alt="Returns list with search and filters" width="49%" />
  <img src="docs/screenshots/return-detail.png" alt="Return detail view" width="49%" />
</p>
<p>
  <img src="docs/screenshots/mobile-dashboard.png" alt="Dashboard on a mobile viewport" width="32%" />
</p>

---

## Principal features

### Dashboard (`/`)

- Headline metrics: total returns, open / in-progress count, completed count,
  and **average processing time** (received → completed, in days) across
  completed returns.
- Bar chart of returns by workflow status.
- Bar chart of the most common return reasons, ranked by volume.
- Dedicated empty and error states when there is no data or the database is
  unreachable.

### Returns list (`/returns`)

- Server-rendered, paginated table (10 per page) of every return.
- Free-text search across return reference, order number, product name, and
  customer name.
- Filters by status, reason, and received-date range.
- **Every filter lives in the URL** (`?search=…&status=…&reason=…&dateFrom=…&dateTo=…&page=…`),
  so a filtered view is shareable, bookmarkable, and survives a refresh.
- CSV export of the **currently filtered** view.

### Create / view / edit a return

- **New return** (`/returns/new`) — a validated form; the return reference
  (`RET-<year>-<sequence>`) is generated automatically.
- **Return detail** (`/returns/[id]`) — the full record plus a workflow panel
  that only offers the statuses it is legal to move to next.
- **Edit** (`/returns/[id]/edit`) — the same form, pre-filled.

### Status workflow

Returns move through a fixed five-stage workflow:

```
RECEIVED → INSPECTING → APPROVED → COMPLETED
                      ↘ REJECTED  → COMPLETED
              (APPROVED can revert to INSPECTING if re-examination is needed)
```

Both the API and the UI reject any transition not in this table. Moving a
record into `COMPLETED` auto-stamps the completion date if one is not supplied;
moving it back out clears it.

### CSV import (`/returns/import`)

A three-step wizard — **upload → preview → commit**:

1. Drop in a `.csv` file (a template is downloadable from the same page).
2. Every row is validated against the **same schema used everywhere else**; the
   preview flags each row as ready, invalid (with the exact field errors), or a
   duplicate (against the database or an earlier row in the same file).
3. Only valid, non-duplicate rows are inserted, in a single transaction. The
   server re-validates from scratch at commit time rather than trusting the
   preview.

Imports are capped at 5,000 rows / 5 MB per file. On export, any cell that
begins with a spreadsheet formula trigger is quote-prefixed so a return record
cannot smuggle a formula into a downstream spreadsheet (CSV injection).

### Audit log (`/audit`, ADMIN only)

Every create, edit, status change, and CSV import writes one row to an
append-only audit table, in the same transaction as the change itself. The
audit page offers filtering by actor, action, entity, and date range.

---

## Roles & permissions

Authorization is **default-deny**: a capability is granted only if the role is
explicitly listed for it in `lib/auth/permissions.ts`.

| Capability | Demo | VIEWER | OPERATOR | ADMIN |
| --- | :---: | :---: | :---: | :---: |
| Dashboard, returns list & detail, search, filters | ✅ | ✅ | ✅ | ✅ |
| CSV **export** of the filtered view | — | ✅ | ✅ | ✅ |
| Create returns | — | — | ✅ | ✅ |
| Edit returns | — | — | ✅ | ✅ |
| Legal status transitions | — | — | ✅ | ✅ |
| CSV **import** | — | — | ✅ | ✅ |
| Audit log (page + API) | — | — | — | ✅ |
| Any capability not listed above | — | — | — | — |

The **public demo account** is a `VIEWER` with an even narrower grant
(`returns:read` only). Its session is forced to the `VIEWER` role regardless of
the database row, so it can browse but cannot export, mutate, or reach the audit
trail.

---

## Technology stack

| Area | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** |
| Language | **TypeScript**, strict mode |
| Styling | **Tailwind CSS 4** |
| Database | **PostgreSQL** (hosted on [Neon](https://neon.tech)) |
| ORM | **Prisma 7** via the `@prisma/adapter-pg` driver adapter over `pg` |
| Validation | **Zod 4** — one shared schema module for API bodies, forms, and CSV rows |
| Auth | **Auth.js** (NextAuth v5), Credentials provider, JWT sessions, **bcryptjs** hashing |
| Charts | **Recharts** |
| Unit tests | **Vitest** |
| End-to-end tests | **Playwright** (desktop + mobile viewports) |
| CSV | Hand-rolled RFC 4180 parser/serializer — no external CSV dependency |
| Hosting | **Vercel** (app) + **Neon** (database) |

---

## Architecture & key engineering decisions

**One validation schema, reused everywhere.** `lib/validation.ts` holds the Zod
schemas for a return record. The create/edit API routes, the CSV import
pipeline, and the React forms all import the same schemas, so a rule is written
once and cannot drift between entry points.

**Shared query logic, no internal HTTP hop.** The returns list *page* (a Server
Component) and the `GET /api/returns` *endpoint* both call the same
`listReturns()` / `buildReturnsWhere()` helpers directly against Prisma. The
page never fetches its own API route over HTTP.

**URL-driven table state.** Search, filters, sort, and pagination live entirely
in the URL query string. The filter bar is a thin client component that only
manipulates `useSearchParams` / `router.push`; the actual data fetch happens
server-side on the resulting request.

**Layered authorization.** Four independent checks, so a bug in one is not a
breach:

1. `proxy.ts` (Next.js 16's renamed middleware) — an *optimistic*, cookie-only
   redirect for unauthenticated requests. It never touches the database and is
   explicitly **not** the only line of defence.
2. Every page re-verifies the session with `requireUser` / `requirePermission`.
3. Every API route and server mutation independently calls `guard()`, which
   returns a real `401` / `403`. Mutations and the audit trail pass
   `{ fresh: true }` to **re-load the user from the database**, so a revoked
   role takes effect on the next request even with a valid session cookie.
4. UI affordances the current role lacks are hidden — but that is cosmetic, and
   e2e tests prove the server rejects the direct API call anyway.

**Append-only audit at the database layer.** Beyond only ever calling
`auditLog.create`, a migration installs PostgreSQL triggers that **reject
`UPDATE`, `DELETE`, and `TRUNCATE`** on the audit table. The trail cannot be
rewritten or wiped by any code path. Audit `metadata` is passed through a
redactor that drops secret-looking keys and truncates long values, so
passwords, tokens, and raw CSV payloads never land in the log.

**Prisma 7 driver adapters.** Prisma 7 removed the bundled Rust query engine.
`PrismaClient` is constructed with an explicit `@prisma/adapter-pg` adapter over
the `pg` driver (`lib/prisma.ts`), and the datasource URL lives in
`prisma.config.ts` rather than `schema.prisma`.

**Pooled runtime, direct migrations.** The app connects through Neon's pooled
(PgBouncer) endpoint via `DATABASE_URL`. Prisma Migrate needs session-level
features the pooler cannot provide, so it is pointed at the unpooled
`DIRECT_URL` instead.

**Enums stored as `TEXT`.** `status` and `reason` are plain text columns
validated only at the application boundary by Zod. Adding a new status or reason
is a code-only change with no migration.

**Deterministic seed data.** `prisma/seed.ts` uses a seeded PRNG (mulberry32),
so the fictional dataset looks realistic (skewed status distribution, weighted
reasons, varied processing times) but is reproducible across runs. The seed
refuses to run against any host that is not `localhost` or `*.neon.tech` unless
an explicit opt-in flag is set.

**Split auth config for the edge.** `auth.config.ts` holds the database-free
configuration; `proxy.ts` builds its own NextAuth instance from just that
object, so the optimistic middleware check never imports Prisma or bcrypt. The
full provider with the `authorize` callback lives in `auth.ts`.

**No CSV library.** The import/export format is a flat one-record-per-row shape;
`lib/csv.ts` implements just enough of RFC 4180 (quoted fields, embedded commas,
quotes, and newlines) to handle it correctly without a dependency.

---

## Authentication, authorization & demo security

### Authentication

- **Auth.js (NextAuth v5)** with a single **Credentials** provider. There is no
  public registration, password recovery, or OAuth — by design, for a fixed set
  of internal users.
- Passwords are stored **only** as a bcrypt hash (work factor 12). Plaintext is
  never persisted or logged.
- Sessions are **stateless JWTs** in an `HttpOnly`, `SameSite=Lax`,
  `Secure`-in-production cookie, signed with `AUTH_SECRET`. No session table
  means every request is a single cookie verification with no database
  round-trip — a good fit for serverless.
- **Generic login errors.** A wrong password, an unknown email, a disabled
  account, and a locked account all return the same message, and a bcrypt
  comparison runs on every path so response time does not reveal whether an
  account exists.
- **Serverless-safe brute-force protection.** Failed attempts are counted on
  the `User` row; after 5 consecutive failures the account locks for 15
  minutes. A successful login clears the counter. No in-memory state, so it
  holds across cold starts and multiple instances.

### Authorization

See [Roles & permissions](#roles--permissions) for the matrix. Enforcement is
the four-layer scheme described under
[Architecture & key engineering decisions](#architecture--key-engineering-decisions);
the important property is that **the server checks stand on their own** and are
covered by e2e tests that call the API directly with a lower-privileged cookie
and assert `403`.

### Demo security

The public "Try demo" button is what makes this app safe to host openly:

- **Credentials never reach the client.** The button's server action reads
  `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` from `process.env` and hands them
  straight to Auth.js. Nothing is exposed through `NEXT_PUBLIC_*`, the client
  bundle, logs, or committed files — `.env.example` carries placeholders only.
- **Always a VIEWER, and less.** The demo account is identified purely by its
  email matching `DEMO_USER_EMAIL`. Every session for it is forced to the
  `VIEWER` role and flagged `isDemo`, which narrows its permission set to
  read-only. It **cannot** create, edit, import, export, change statuses, or
  open the audit log — enforced by the same `guard()` layer as every other
  role, and covered by unit tests plus an e2e spec.
- **Fictional data only.** The entire database is generated from
  `prisma/seed.ts`; the demo account is read-only on top of that.

---

## Local setup

Requirements: **Node.js 20+** and a **PostgreSQL 14+** database (the project is
developed against Neon; any Postgres instance works).

```bash
git clone https://github.com/lucapantis/returnops.git
cd returnops
npm install

# Copy the environment template — it contains PLACEHOLDERS ONLY.
cp .env.example .env
```

Edit `.env` and set your own values:

```dotenv
# Your PostgreSQL connection strings (pooled for the app, direct for migrations)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

```bash
# Generate strong local auth secrets & demo-account passwords into .env
# (only fills in variables that are missing; never prints or overwrites values)
npm run auth:init

# Apply the database migrations
npm run db:migrate

# Seed 72 fictional returns + the ADMIN / VIEWER / OPERATOR accounts
npm run db:seed

# Start the dev server
npm run dev
```

Open <http://localhost:3000> and sign in. The seeded account emails default to
`admin@returnops.local`, `operator@returnops.local`, and
`viewer@returnops.local`; their passwords are the strong random values that
`npm run auth:init` wrote into your **git-ignored** `.env`. No real credential
is ever committed — `.env` is ignored, and only `.env.example` (placeholders)
is tracked.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests once (Vitest) |
| `npm run e2e` | Playwright end-to-end tests (spins up a dev server) |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed the database with fictional data |
| `npm run demo:provision` | Upsert **only** the locked-down demo VIEWER account |

---

## Tests & verified results

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests
npm run build       # next build (production)
npm run e2e         # Playwright — needs a seeded, disposable database
```

**Verified on 2026-08-31** (Node 22, Next.js 16.3.3):

| Command | Result |
| --- | --- |
| `npm run lint` | ✅ pass, no warnings |
| `npm run typecheck` | ✅ pass |
| `npm run test` | ✅ **106 passed** (14 test files) |
| `npm run build` | ✅ production build succeeded (17 routes) |
| `npm run e2e` | Not run here — requires a disposable seeded database and a live server; see below |

**Unit tests** cover the pure logic in `lib/` with no database connection: the
Zod schemas, the CSV parser/serializer, import row validation and
deduplication, metrics aggregation, status-transition rules, the **permission
matrix**, the **`guard()` authorization logic** (including the `{ fresh: true }`
database re-check), **password hashing**, the **lockout** state machine,
**callback-URL open-redirect sanitisation**, the **seed account upsert** rules,
and **audit metadata redaction**.

**End-to-end tests** (`e2e/`) drive the whole stack in a real browser on desktop
and mobile (Pixel 7) viewports and cover: valid/invalid login and the generic
error; unauthenticated redirects and `401`s; a forged session cookie; off-site
`callbackUrl` rejection; VIEWER mutation attempts rejected `403` at the API;
the full OPERATOR create/edit/transition/import workflow; ADMIN audit access
and the absence of raw CSV content in audit rows; and logout. They need the
seeded accounts and a throwaway database, so run
`npm run auth:init && npm run db:seed` first and point `.env` at a database you
can freely wipe.

---

## Deployment architecture

```
                    ┌─────────────────────────┐
   Browser  ───────▶│  Vercel (Next.js 16)    │
                    │  • Server Components     │
                    │  • Route handlers / API  │
                    │  • proxy.ts (middleware) │
                    └───────────┬─────────────┘
                                │  Prisma + @prisma/adapter-pg
                     pooled     │            direct (migrations only)
                 DATABASE_URL   │        DIRECT_URL
                                ▼
                    ┌─────────────────────────┐
                    │  Neon PostgreSQL        │
                    │  • pooled (PgBouncer)   │
                    │  • direct endpoint      │
                    └─────────────────────────┘
```

- **App:** deployed on **Vercel**. Server Components and API route handlers run
  as serverless functions; `proxy.ts` runs as middleware for the optimistic
  auth redirect.
- **Database:** **Neon** serverless PostgreSQL. The app runtime uses the pooled
  endpoint (`DATABASE_URL`); the Prisma CLI uses the direct endpoint
  (`DIRECT_URL`) for migrations.
- **Migrations:** `npm run db:migrate` runs `prisma migrate deploy`, which
  applies committed migrations without needing a shadow database.
- **Environment variables on the deployment:** only `DATABASE_URL`,
  `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, and — to enable the demo button —
  `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`. The `SEED_*` variables are only
  needed when seeding a database.
- **Demo account provisioning:** `npm run demo:provision` is run once against
  the demo database from a trusted machine. It upserts only the single demo
  VIEWER row — no migrations, no return seeding, no changes to any other
  record.

---

## Known limitations

This is an MVP with a deliberately bounded scope.

- **No optimistic concurrency control on edits.** "Last write wins" is fine for
  a small team; a concurrent create that loses a `returnRef` race is surfaced
  as a clean `409`, not a crash.
- **CSV import is capped** at 5,000 rows / 5 MB per file so a single import fits
  in one transaction. Export is capped at 20,000 rows.
- **Charts are not fully screen-reader accessible.** They are SVG (Recharts);
  the same figures are printed as data labels on every bar as a mitigation.
- **Brute-force lockout is per account, not per IP.** Appropriate for a small
  fixed set of internal users, but it does not stop a distributed attack, and
  someone who knows an email can lock that user out for 15 minutes (a
  deliberate trade-off).
- **No password rotation, expiry, complexity policy (beyond a 12-character
  minimum), MFA, or "log out all devices"** — out of scope.
- **JWT sessions cannot be revoked centrally before they expire.** Every
  mutation and the audit trail re-check the database, so a downgraded or
  disabled account immediately loses write and audit access; but a stale
  session can still *read* ordinary returns data until it expires. Lowering the
  session `maxAge` is the lever if that matters.
- **The audit log records mutations only** (not reads or logins) and keeps a
  single batch row per CSV import rather than one row per imported record.
- **Account management** (create / disable / change role) is done via the seed
  or direct database access — there is no admin user-management UI.
- **`next-auth` is on its v5 beta line** — the only channel with Next.js 16
  support. Stable in practice, but not a final release.
- **`npm audit`** reports issues in `deepmerge-ts`, a dev-only transitive
  dependency of `@prisma/config` with no runtime exposure and no non-breaking
  fix at the current Prisma 7.10.x line.

---

## Project structure

```
auth.ts                 Auth.js instance (Credentials provider, authorize logic)
auth.config.ts          DB-free Auth.js config shared with the proxy
proxy.ts                Next.js 16 middleware (optimistic route protection)
app/
  page.tsx              Dashboard
  login/                Login page + sign-in / demo / sign-out server actions
  forbidden/            403 state for authenticated-but-not-permitted users
  audit/                ADMIN-only audit log (filters + pagination)
  returns/              Returns list, new / edit / detail, import wizard
  api/                  Auth.js, returns REST endpoints, metrics, audit query
components/
  dashboard/            Chart + stat-card components
  returns/              Table, filters, pagination, form, workflow actions
  import/               CSV import wizard
  audit/                Audit table + filter bar
  layout/ · ui/         App shell, nav, and shared primitives
lib/                    Framework-agnostic logic: validation, CSV, import,
                        metrics, Prisma client, query builders — all unit-tested
  auth/                 Permission matrix, password hashing, lockout, guards
prisma/                 Schema, migrations, deterministic seed script
e2e/                    Playwright end-to-end tests
docs/screenshots/       Screenshots used in this README
```
