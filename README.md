# ReturnOps

ReturnOps is a returns and operational-record management system: a single-tenant
dashboard for logging, tracking and reporting on product returns through a
fixed inspection-and-resolution workflow. It's a local MVP built with fully
fictional demo data — no real company, customer or order information is used
anywhere in the codebase or seed data.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS 4** for styling
- **Prisma 7** ORM on **SQLite**, via the `@prisma/adapter-better-sqlite3`
  driver adapter (Prisma 7 no longer ships a bundled query engine — see
  [Architecture decisions](#architecture-decisions))
- **Zod 4** for all input validation (API bodies, forms, CSV rows) from a
  single shared schema module
- **Recharts** for the dashboard visualizations
- **Vitest** for unit tests, **Playwright** for an end-to-end test
- A hand-rolled RFC4180 CSV parser/serializer (no external CSV dependency)

No authentication is implemented — this is a local single-user MVP.

## Getting started

Requirements: Node.js 20+.

```bash
npm install

# Copy the environment template (only DATABASE_URL is required)
cp .env.example .env

# Create the SQLite database and apply migrations
npm run db:migrate

# Seed it with ~76 realistic fictional return records
npm run db:seed

# Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The dashboard,
returns list and charts will be populated from the seed data immediately.

To wipe the database and start over (re-applies migrations and re-seeds in
one step):

```bash
npm run db:reset
```

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
| `npm run db:migrate`   | Apply Prisma migrations (`prisma migrate dev`)         |
| `npm run db:seed`      | Seed the database (`prisma db seed`)                   |
| `npm run db:reset`     | Drop, re-migrate and re-seed the database               |

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

## Architecture decisions

- **No native SQLite enums.** `status` and `reason` are stored as plain
  `TEXT` columns and validated exclusively at the application boundary via
  the Zod schemas in `lib/validation.ts` — the single source of truth reused
  by the create/edit API routes, the CSV import pipeline, and the forms.
- **Prisma 7 driver adapters.** Prisma 7 removed the bundled Rust query
  engine; `PrismaClient` is constructed with an explicit
  `@prisma/adapter-better-sqlite3` adapter (`lib/prisma.ts`), and the
  datasource URL lives in `prisma.config.ts` rather than `schema.prisma`
  (schema-embedded datasource URLs are no longer supported).
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
- **No authentication.** Out of scope for this MVP by design — see the
  project brief. Everything is single-tenant and unauthenticated.

## Testing

```bash
npm run test        # unit tests: validation, CSV parsing, import logic, metrics
npm run e2e          # Playwright: dashboard → browse/filter → create → advance
                      # status → bulk import, against a real dev server + DB
```

Unit tests cover the pure logic in `lib/` (Zod schemas, CSV parse/serialize,
import row validation/deduplication, metrics aggregation, status-transition
rules) without touching the database. The Playwright suite exercises the
whole stack end to end and is safe to re-run repeatedly — it generates a
unique record suffix per run rather than relying on fixed IDs, so it never
collides with itself or the seed data.

## Known limitations

- `npm audit` reports vulnerabilities in `deepmerge-ts`, a transitive
  dev-only dependency pulled in by `@prisma/config`. It has no runtime
  exposure (it's not part of the built app) and there's no non-breaking fix
  available at the current Prisma 7.10.x line.
- No optimistic concurrency control on edits — a "last write wins" model is
  fine for a single-user local MVP but wouldn't be for concurrent multi-user
  use.
- CSV import is capped at 5,000 rows per file (`lib/importDb.ts`) to keep a
  single import within one database transaction.

## Project structure

```
app/                    Routes (App Router)
  page.tsx              Dashboard
  returns/               Returns list, new/edit/detail, import wizard
  api/returns/           REST endpoints (list/create, get/patch, export, import)
  api/metrics/           Dashboard metrics endpoint
components/
  dashboard/             Chart + stat card components
  returns/               Table, filters, pagination, form, workflow actions
  import/                CSV import wizard
  ui/                    Shared primitives (Button, Badge, PageHeader, empty/error states)
lib/                    Framework-agnostic logic: validation, CSV, import,
                        metrics, Prisma client, query builders — all unit-tested
prisma/                 Schema, migrations, seed script
e2e/                    Playwright end-to-end test
```
