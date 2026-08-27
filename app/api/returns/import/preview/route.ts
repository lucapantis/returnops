import { NextRequest, NextResponse } from "next/server";
import { parseCsvToRecords } from "@/lib/csv";
import { validateImportRows } from "@/lib/import";
import { loadExistingKeys, MAX_IMPORT_ROWS } from "@/lib/importDb";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const csvText = (body as { csvText?: unknown })?.csvText;
  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return NextResponse.json({ error: "csvText is required" }, { status: 400 });
  }

  const { headers, records } = parseCsvToRecords(csvText);

  if (records.length === 0) {
    return NextResponse.json(
      { error: "No data rows found in the CSV file" },
      { status: 400 }
    );
  }

  if (records.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `CSV has ${records.length} rows; the limit per import is ${MAX_IMPORT_ROWS}` },
      { status: 400 }
    );
  }

  const existing = await loadExistingKeys();
  const result = validateImportRows(headers, records, existing);

  return NextResponse.json({ data: result });
}
