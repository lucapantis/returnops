import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { buildReturnsWhere } from "@/lib/returnsQuery";
import { listReturnsQuerySchema } from "@/lib/validation";
import type { ReturnDto } from "@/lib/serialize";
import { serializeReturn } from "@/lib/serialize";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";

const EXPORT_COLUMNS: { key: keyof ReturnDto; header: string }[] = [
  { key: "returnRef", header: "Return Reference" },
  { key: "orderNumber", header: "Order Number" },
  { key: "productName", header: "Product Name" },
  { key: "sku", header: "SKU" },
  { key: "customerName", header: "Customer Name" },
  { key: "reason", header: "Reason" },
  { key: "status", header: "Status" },
  { key: "receivedDate", header: "Received Date" },
  { key: "completedDate", header: "Completed Date" },
  { key: "operatorNotes", header: "Operator Notes" },
];

export async function GET(request: NextRequest) {
  const authz = await guard("returns:export");
  if (!authz.ok) return authz.response;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listReturnsQuerySchema
    .omit({ page: true, pageSize: true })
    .safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { sortBy, sortDir } = parsed.data;
  const where = buildReturnsWhere(parsed.data);

  try {
    const records = await prisma.return.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      take: 20000,
    });

    const csv = toCsv(EXPORT_COLUMNS, records.map(serializeReturn));
    const filename = `returnops-returns-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
