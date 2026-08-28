import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReturn } from "@/lib/serialize";
import { listReturns } from "@/lib/returnsQuery";
import { createReturnSchema, listReturnsQuerySchema } from "@/lib/validation";
import { generateNextReturnRef } from "@/lib/returnRef";
import { handleApiError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listReturnsQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await listReturns(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const returnRef =
      data.returnRef ?? (await generateNextReturnRef(data.receivedDate));

    const existing = await prisma.return.findUnique({ where: { returnRef } });
    if (existing) {
      return NextResponse.json(
        { error: `Return reference "${returnRef}" already exists` },
        { status: 409 }
      );
    }

    const created = await prisma.return.create({
      data: {
        returnRef,
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

    return NextResponse.json({ data: serializeReturn(created) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
