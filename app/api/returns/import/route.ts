import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prepareImport } from "@/lib/importDb";
import { handleApiError } from "@/lib/apiError";

// Commits a CSV import. Re-validates from scratch server-side (never trusts
// a client-held preview result, since the DB may have changed since).
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const prepared = await prepareImport((body as { csvText?: unknown })?.csvText);
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const result = prepared.result;
    const skipped = result.invalidRows.length + result.duplicateRows.length;

    if (result.validRows.length === 0) {
      return NextResponse.json({
        data: { imported: 0, skipped, totalRows: result.totalRows },
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
        skipped,
        totalRows: result.totalRows,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
