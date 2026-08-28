import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiError";
import { guard } from "@/lib/auth/guard";
import { auditQuerySchema, listAuditLogs } from "@/lib/auditQuery";

export async function GET(request: NextRequest) {
  // `fresh: true`: the audit trail is the most sensitive read in the app, so it
  // is re-checked against the database. A user just demoted out of ADMIN (or
  // disabled) loses access on their next request, not when their JWT expires.
  const authz = await guard("audit:read", { fresh: true });
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
