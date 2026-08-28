import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";
import { auditQuerySchema, listAuditLogs } from "@/lib/auditQuery";

export async function GET(request: NextRequest) {
  const authz = await guard("audit:read");
  if (!authz.ok) return authz.response;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = auditQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await listAuditLogs(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
