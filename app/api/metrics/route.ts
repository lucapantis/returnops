import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMetrics } from "@/lib/metrics";

export async function GET() {
  const records = await prisma.return.findMany({
    select: { status: true, reason: true, receivedDate: true, completedDate: true },
  });

  const metrics = computeMetrics(records);

  return NextResponse.json({ data: metrics });
}
