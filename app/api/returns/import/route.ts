import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { prepareImport } from "@/lib/importDb";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";
import { auditCreateArgs } from "@/lib/audit";

// Commits a CSV import. Re-validates from scratch server-side (never trusts
// a client-held preview result, since the DB may have changed since).
export async function POST(request: NextRequest) {
  const authz = await guard("returns:import", { fresh: true });
  if (!authz.ok) return authz.response;
  const actor = authz.user;

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

    const batchId = randomUUID();
    const rowsToCreate = result.validRows.map((row) => {
      const d = row.data!;
      return {
        returnRef: d.returnRef,
        orderNumber: d.orderNumber,
        productName: d.productName,
        sku: d.sku,
        customerName: d.customerName,
        reason: d.reason,
        status: d.status,
        receivedDate: d.receivedDate,
        completedDate: d.completedDate ?? null,
        operatorNotes: d.operatorNotes ?? null,
      };
    });

    // All inserts plus the single batch audit entry commit or roll back
    // together, in one transaction.
    const ops = [
      ...rowsToCreate.map((data) => prisma.return.create({ data })),
      prisma.auditLog.create(
        auditCreateArgs({
          actor,
          action: "return.csv_import",
          entityType: "Return",
          entityId: batchId,
          // Counts and the created references only — never the raw CSV body.
          metadata: {
            batchId,
            imported: rowsToCreate.length,
            skipped,
            totalRows: result.totalRows,
            returnRefs: rowsToCreate.map((r) => r.returnRef),
          },
        })
      ),
    ];

    const settled = await prisma.$transaction(ops);
    const imported = settled.length - 1; // last op is the audit row

    return NextResponse.json({
      data: {
        imported,
        skipped,
        totalRows: result.totalRows,
        batchId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
