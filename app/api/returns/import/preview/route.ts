import { NextRequest, NextResponse } from "next/server";
import { prepareImport } from "@/lib/importDb";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";

export async function POST(request: NextRequest) {
  const authz = await guard("returns:import");
  if (!authz.ok) return authz.response;

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

    return NextResponse.json({ data: prepared.result });
  } catch (error) {
    return handleApiError(error);
  }
}
