# ReturnOps — Implementation Plan

Fictional returns & operational-record management system (MVP).

## Stack
Next.js (App Router, TypeScript) · Tailwind CSS · Prisma 7 + PostgreSQL (Neon),
`@prisma/adapter-pg` driver adapter · Zod · Recharts · Vitest · Playwright.

> Originally built on SQLite; migrated to Neon PostgreSQL. The SQLite
> `init` migration was SQLite-only DDL and was replaced with a fresh
> PostgreSQL baseline (`prisma/migrations/*_init`); `migration_lock.toml`
> is now `postgresql`. Runtime uses the pooled `DATABASE_URL`; Prisma
> Migrate/CLI uses the direct `DIRECT_URL` (configured in `prisma.config.ts`).
> See README → Architecture decisions for the full rationale.

## Data model (Prisma)
`Return`:
- `id` (cuid, internal PK)
- `returnRef` (string, unique, e.g. `RET-2026-0001`)
- `orderNumber` (string)
- `productName` (string)
- `sku` (string)
- `customerName` (string)
- `reason` (enum: DAMAGED, WRONG_ITEM, NOT_AS_DESCRIBED, NO_LONGER_NEEDED, DEFECTIVE, SIZE_FIT, OTHER)
- `status` (enum: RECEIVED, INSPECTING, APPROVED, REJECTED, COMPLETED)
- `receivedDate` (DateTime)
- `completedDate` (DateTime, nullable)
- `operatorNotes` (string, nullable)
- `createdAt` / `updatedAt`

Unique constraint on (`orderNumber`, `productName`, `sku`) is NOT enforced at DB level (returns can legitimately repeat), but CSV import flags duplicate `returnRef` and duplicate `orderNumber`+`sku` combos as warnings.

## Architecture decisions
- Server-side data access via Prisma in API route handlers under `app/api/**`; client components call these via `fetch`.
- PostgreSQL (Neon) via the `@prisma/adapter-pg` driver adapter; `lib/dbGuard.ts` fails fast on a missing/non-Postgres `DATABASE_URL`, and the seed refuses non-local/non-Neon hosts unless explicitly opted in.
- Free-text search sets Prisma `mode: "insensitive"` so it stays case-insensitive as it was on SQLite.
- Zod schemas in `lib/validation.ts` shared between API routes and forms — single source of truth for required fields.
- Pagination, search and filters implemented server-side via query params on `GET /api/returns`.
- CSV parsing is hand-rolled in `lib/csv.ts` (no extra dependency) — small RFC4180-ish parser sufficient for MVP fields (no embedded newlines needed for our fields, but quoted-field/comma escaping is supported).
- Metrics computed server-side in `lib/metrics.ts`, exposed via `GET /api/metrics`, consumed by dashboard.
- No auth in this MVP (explicitly out of scope).

## Routes (pages)
- `/` — Dashboard: KPI tiles + charts (status breakdown, top reasons, avg processing time trend).
- `/returns` — Table: search, filters (status/reason/date range), pagination, CSV export, link to import & create.
- `/returns/new` — Create form.
- `/returns/[id]` — View + inline edit (status workflow, notes, dates).
- `/returns/import` — CSV upload → preview (valid/invalid rows, duplicates) → confirm import.

## API routes
- `GET /api/returns` — list (search/filter/paginate)
- `POST /api/returns` — create
- `GET /api/returns/[id]` — detail
- `PATCH /api/returns/[id]` — update
- `POST /api/returns/import/preview` — parse+validate CSV, no DB write
- `POST /api/returns/import` — commit validated rows
- `GET /api/returns/export` — CSV export honoring current filters
- `GET /api/metrics` — dashboard aggregates

## Status workflow
`RECEIVED → INSPECTING → APPROVED/REJECTED → COMPLETED` (APPROVED and REJECTED can both move to COMPLETED). Enforced in UI (allowed next-status list) and validated server-side.

## Testing
- Vitest: `lib/validation.ts`, `lib/csv.ts`, `lib/metrics.ts`, status-transition helper.
- Playwright: one critical flow — create a return, see it in the table, open it, transition its status, confirm dashboard/table reflect it.

## Milestones
1. Scaffold Next.js + Tailwind + TS strict.
2. Prisma schema + PostgreSQL (Neon) + seed script (72 fictional returns across statuses/dates).
3. Core API routes + Zod validation.
4. Returns table + pagination + search/filters.
5. Create/view/edit pages + status workflow.
6. CSV import (preview + commit) + CSV export.
7. Dashboard metrics + Recharts.
8. Loading/empty/error states polish.
9. Vitest unit tests + Playwright e2e.
10. Lint, typecheck, build, fix issues.
11. README + final verification.
