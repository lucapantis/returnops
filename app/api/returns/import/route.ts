import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvToRecords } from "@/lib/csv";
import { validateImportRows } from "@/lib/import";
import { loadExistingKeys, MAX_IMPORT_ROWS } from "@/lib/importDb";

// Commits a CSV import. Re-validates from scratch server-side (never trusts
// a client-held preview result, since the DB may have changed since).
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

  if (result.validRows.length === 0) {
    return NextResponse.json({
      data: {
        imported: 0,
        skipped: result.invalidRows.length + result.duplicateRows.length,
        totalRows: result.totalRows,
      },
    });
  }

  const created = await prisma.$transaction(
    result.validRows.map((row) => {
      const data = row.data!;
      return prisma.return.create({
        data: {
          returnRef: data.returnRef,
          orderNumber: data.orderNumber,
          productName: data.productName,
          sku: data.sku,
          customerName: data.customerName,
          reason: data.reason,
          status: data.status,
          receivedDate: data.receivedDate,
          completedDate: data.completedDate ?? null,
          operatorNotes: data.operatorNotes ?? null,
        },
      });
    })
  );

  return NextResponse.json({
    data: {
      imported: created.length,
      skipped: result.invalidRows.length + result.duplicateRows.length,
      totalRows: result.totalRows,
    },
  });
}
