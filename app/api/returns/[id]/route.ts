import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReturn } from "@/lib/serialize";
import { updateReturnSchema } from "@/lib/validation";
import { isValidTransition, type ReturnStatus } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const record = await prisma.return.findUnique({ where: { id } });

  if (!record) {
    return NextResponse.json({ error: "Return not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeReturn(record) });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.return.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Return not found" }, { status: 404 });
  }

  const data = parsed.data;

  if (data.status && data.status !== existing.status) {
    const from = existing.status as ReturnStatus;
    if (!isValidTransition(from, data.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition status from ${existing.status} to ${data.status}`,
        },
        { status: 400 }
      );
    }
  }

  // Moving into COMPLETED without an explicit completedDate stamps "now".
  let completedDate = data.completedDate;
  if (data.status === "COMPLETED" && completedDate === undefined && !existing.completedDate) {
    completedDate = new Date();
  }
  // Moving out of a terminal state (e.g. APPROVED -> INSPECTING) clears it.
  if (data.status && data.status !== "COMPLETED" && completedDate === undefined) {
    completedDate = null;
  }

  const updated = await prisma.return.update({
    where: { id },
    data: {
      ...(data.orderNumber !== undefined ? { orderNumber: data.orderNumber } : {}),
      ...(data.productName !== undefined ? { productName: data.productName } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.receivedDate !== undefined ? { receivedDate: data.receivedDate } : {}),
      ...(completedDate !== undefined ? { completedDate } : {}),
      ...(data.operatorNotes !== undefined ? { operatorNotes: data.operatorNotes } : {}),
    },
  });

  return NextResponse.json({ data: serializeReturn(updated) });
}
