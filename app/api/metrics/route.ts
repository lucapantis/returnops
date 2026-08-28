import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMetrics } from "@/lib/metrics";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const records = await prisma.return.findMany({
      select: { status: true, reason: true, receivedDate: true, completedDate: true },
    });

    const metrics = computeMetrics(records);

    return NextResponse.json({ data: metrics });
  } catch (error) {
    return handleApiError(error);
  }
}
