import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReturn } from "@/lib/serialize";
import { listReturns } from "@/lib/returnsQuery";
import { createReturnSchema, listReturnsQuerySchema } from "@/lib/validation";
import { generateNextReturnRef } from "@/lib/returnRef";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";
import { auditCreateArgs } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const authz = await guard("returns:read");
  if (!authz.ok) return authz.response;

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
  const authz = await guard("returns:create", { fresh: true });
  if (!authz.ok) return authz.response;
  const actor = authz.user;

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

    // The record and its audit entry commit together.
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.return.create({
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
      await tx.auditLog.create(
        auditCreateArgs({
          actor,
          action: "return.create",
          entityType: "Return",
          entityId: row.id,
          metadata: {
            returnRef: row.returnRef,
            after: {
              status: row.status,
              reason: row.reason,
              orderNumber: row.orderNumber,
              sku: row.sku,
            },
          },
        })
      );
      return row;
    });

    return NextResponse.json({ data: serializeReturn(created) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
