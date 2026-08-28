import { prisma } from "./prisma";
import { parseCsvToRecords } from "./csv";
import { validateImportRows, type ExistingRecordKeys, type ImportPreviewResult } from "./import";

const MAX_IMPORT_ROWS = 5000;
// Upper bound on the raw upload we'll parse. Comfortably fits MAX_IMPORT_ROWS
// of realistic data while stopping a pathologically large body from being
// buffered and parsed in memory.
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export { MAX_IMPORT_ROWS, MAX_CSV_BYTES };

/** Loads the keys needed for duplicate detection against the current database. */
export async function loadExistingKeys(): Promise<ExistingRecordKeys> {
  const records = await prisma.return.findMany({
    select: { returnRef: true, orderNumber: true, sku: true },
  });

  const returnRefs = new Set(records.map((r) => r.returnRef.toLowerCase()));
  const orderSkuPairs = new Set(
    records.map((r) => `${r.orderNumber.toLowerCase()}::${r.sku.toLowerCase()}`)
  );

  return { returnRefs, orderSkuPairs };
}

export type PrepareImportResult =
  | { ok: false; error: string; status: number }
  | { ok: true; result: ImportPreviewResult };

/**
 * Shared pipeline for both the preview and commit endpoints: validate the
 * request payload, parse the CSV, enforce the row/size limits, and run the
 * full row validation against the current database. Both routes re-run this
 * from scratch so a commit never trusts a stale client-held preview.
 */
export async function prepareImport(csvText: unknown): Promise<PrepareImportResult> {
  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return { ok: false, error: "csvText is required", status: 400 };
  }

  if (csvText.length > MAX_CSV_BYTES) {
    return {
      ok: false,
      error: "CSV file is too large to import",
      status: 413,
    };
  }

  const { headers, records } = parseCsvToRecords(csvText);

  if (records.length === 0) {
    return { ok: false, error: "No data rows found in the CSV file", status: 400 };
  }

  if (records.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `CSV has ${records.length} rows; the limit per import is ${MAX_IMPORT_ROWS}`,
      status: 400,
    };
  }

  const existing = await loadExistingKeys();
  const result = validateImportRows(headers, records, existing);

  return { ok: true, result };
}
