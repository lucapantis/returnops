import { describe, expect, it } from "vitest";
import { validateImportRows, type ExistingRecordKeys } from "./import";
import { REQUIRED_CSV_COLUMNS } from "./validation";

const headers = [...REQUIRED_CSV_COLUMNS];

const emptyExisting: ExistingRecordKeys = {
  returnRefs: new Set(),
  orderSkuPairs: new Set(),
};

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    returnRef: "RET-2026-0001",
    orderNumber: "ORD-100001",
    productName: "Aero Runner Mesh Sneakers",
    sku: "AR-1004-WHT",
    customerName: "Amara Okafor",
    reason: "DAMAGED",
    status: "RECEIVED",
    receivedDate: "2026-01-05",
    ...overrides,
  };
}

describe("validateImportRows", () => {
  it("accepts a fully valid row", () => {
    const result = validateImportRows(headers, [row()], emptyExisting);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(0);
    expect(result.duplicateRows).toHaveLength(0);
  });

  it("flags a row with an invalid enum value", () => {
    const result = validateImportRows(headers, [row({ reason: "LOST" })], emptyExisting);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.validRows).toHaveLength(0);
  });

  it("flags a row missing a required field", () => {
    const result = validateImportRows(headers, [row({ customerName: "" })], emptyExisting);
    expect(result.invalidRows).toHaveLength(1);
  });

  it("reports missing required columns for every row", () => {
    const partialHeaders = headers.filter((h) => h !== "sku");
    const result = validateImportRows(partialHeaders, [row()], emptyExisting);
    expect(result.missingColumns).toEqual(["sku"]);
    expect(result.invalidRows).toHaveLength(1);
  });

  it("flags duplicate returnRef within the same file", () => {
    const result = validateImportRows(
      headers,
      [row(), row({ orderNumber: "ORD-999999" })],
      emptyExisting
    );
    expect(result.validRows).toHaveLength(1);
    expect(result.duplicateRows).toHaveLength(1);
    expect(result.duplicateRows[0]?.duplicateReason).toMatch(/return reference/i);
  });

  it("flags duplicate order/SKU combination within the same file", () => {
    const result = validateImportRows(
      headers,
      [row(), row({ returnRef: "RET-2026-0002" })],
      emptyExisting
    );
    expect(result.validRows).toHaveLength(1);
    expect(result.duplicateRows).toHaveLength(1);
    expect(result.duplicateRows[0]?.duplicateReason).toMatch(/order\/SKU/i);
  });

  it("flags a row that duplicates an existing DB record", () => {
    const existing: ExistingRecordKeys = {
      returnRefs: new Set(["ret-2026-0001"]),
      orderSkuPairs: new Set(),
    };
    const result = validateImportRows(headers, [row()], existing);
    expect(result.duplicateRows).toHaveLength(1);
  });

  it("computes totalRows across valid, invalid and duplicate rows", () => {
    const result = validateImportRows(
      headers,
      [row(), row({ reason: "LOST" }), row({ returnRef: "RET-2026-0002" })],
      emptyExisting
    );
    expect(result.totalRows).toBe(3);
  });
});
