import { csvRowSchema, REQUIRED_CSV_COLUMNS, type CsvRowInput } from "./validation";

export interface ImportRowResult {
  rowNumber: number; // 1-based, counting the header as row 1 (so first data row is 2)
  raw: Record<string, string>;
  data: CsvRowInput | null;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason: string | null;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: ImportRowResult[];
  invalidRows: ImportRowResult[];
  duplicateRows: ImportRowResult[];
  missingColumns: string[];
}

export interface ExistingRecordKeys {
  returnRefs: Set<string>;
  orderSkuPairs: Set<string>;
}

function orderSkuKey(orderNumber: string, sku: string): string {
  return `${orderNumber.toLowerCase()}::${sku.toLowerCase()}`;
}

/**
 * Validates parsed CSV records against the return schema, flagging invalid
 * rows and duplicates (both against existing DB records and within the
 * file itself). Performs no I/O — callers supply existing DB keys so this
 * stays pure and unit-testable.
 */
export function validateImportRows(
  headers: string[],
  records: Record<string, string>[],
  existing: ExistingRecordKeys
): ImportPreviewResult {
  const missingColumns = REQUIRED_CSV_COLUMNS.filter(
    (col) => !headers.includes(col)
  );

  const seenReturnRefs = new Set<string>();
  const seenOrderSku = new Set<string>();

  const rows: ImportRowResult[] = records.map((raw, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row
    const errors: string[] = [];

    if (missingColumns.length > 0) {
      return {
        rowNumber,
        raw,
        data: null,
        errors: [`Missing required column(s): ${missingColumns.join(", ")}`],
        isDuplicate: false,
        duplicateReason: null,
      };
    }

    // Normalize empty-string optional fields to undefined so Zod's
    // nullish() doesn't try to coerce "" into a Date.
    const candidate = {
      ...raw,
      completedDate: raw.completedDate ? raw.completedDate : undefined,
      operatorNotes: raw.operatorNotes ? raw.operatorNotes : undefined,
    };

    const parsed = csvRowSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "row";
        errors.push(`${field}: ${issue.message}`);
      }
      return { rowNumber, raw, data: null, errors, isDuplicate: false, duplicateReason: null };
    }

    const data = parsed.data;

    // Duplicate detection: return reference must be globally unique.
    const refKey = data.returnRef.toLowerCase();
    let isDuplicate = false;
    let duplicateReason: string | null = null;

    if (existing.returnRefs.has(refKey) || seenReturnRefs.has(refKey)) {
      isDuplicate = true;
      duplicateReason = `Duplicate return reference "${data.returnRef}"`;
    } else {
      const pairKey = orderSkuKey(data.orderNumber, data.sku);
      if (existing.orderSkuPairs.has(pairKey) || seenOrderSku.has(pairKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate order/SKU combination (order ${data.orderNumber}, SKU ${data.sku})`;
      }
    }

    seenReturnRefs.add(refKey);
    seenOrderSku.add(orderSkuKey(data.orderNumber, data.sku));

    return { rowNumber, raw, data, errors, isDuplicate, duplicateReason };
  });

  return {
    totalRows: rows.length,
    validRows: rows.filter((r) => r.errors.length === 0 && !r.isDuplicate),
    invalidRows: rows.filter((r) => r.errors.length > 0),
    duplicateRows: rows.filter((r) => r.errors.length === 0 && r.isDuplicate),
    missingColumns,
  };
}
