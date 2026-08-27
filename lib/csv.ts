// Minimal RFC4180-style CSV parser/serializer. No external dependency is
// needed for the flat, single-line-per-record data this app deals with, but
// quoted fields (with embedded commas, quotes or newlines) are still handled
// correctly since operator notes may contain commas.

/** Parses CSV text into an array of string rows (each row an array of cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalize line endings up front, but keep the state machine simple by
  // scanning character-by-character (fields can contain literal \n once quoted).
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Flush the trailing field/row (files without a final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty trailing rows (common with a trailing newline).
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Parses CSV text with a header row into an array of header->value records. */
export function parseCsvToRecords(text: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }
  const headers = (rows[0] ?? []).map((h) => h.trim());
  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (row[idx] ?? "").trim();
    });
    return record;
  });
  return { headers, records };
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serializes an array of objects into CSV text using the given column order. */
export function toCsv<T extends object>(
  columns: { key: keyof T; header: string }[],
  rows: T[]
): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key] as unknown;
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return escapeCsvField(value.toISOString());
        return escapeCsvField(String(value));
      })
      .join(",")
  );
  return [headerLine, ...lines].join("\n") + "\n";
}
