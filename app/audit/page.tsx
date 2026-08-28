import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Pagination } from "@/components/returns/Pagination";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { AuditTable } from "@/components/audit/AuditTable";
import { requirePermission } from "@/lib/auth/guard";
import { auditQuerySchema, listAuditLogs, type ListAuditResult } from "@/lib/auditQuery";

export const metadata: Metadata = { title: "Audit log — ReturnOps" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryRecord(raw: SearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.length > 0) record[key] = value;
    else if (Array.isArray(value) && value[0]) record[key] = value[0];
  }
  return record;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("audit:read");

  const raw = await searchParams;
  const queryRecord = toQueryRecord(raw);
  const parsed = auditQuerySchema.safeParse(queryRecord);

  if (!parsed.success) {
    return (
      <div>
        <PageHeader title="Audit log" description="Append-only history of every recorded mutation." />
        <ErrorState description="Those filters aren't valid. Try clearing them and starting again." />
      </div>
    );
  }

  let result: ListAuditResult;
  try {
    result = await listAuditLogs(parsed.data);
  } catch {
    return (
      <div>
        <PageHeader title="Audit log" description="Append-only history of every recorded mutation." />
        <ErrorState description="Could not load the audit log." />
      </div>
    );
  }

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(queryRecord);
    params.set("page", String(page));
    return `/audit?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only history of every create, edit, status change and CSV import."
      />

      <div className="mb-4">
        <AuditFilters />
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="No recorded activity matches these filters yet."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <AuditTable rows={result.data} />
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            total={result.pagination.total}
            pageSize={result.pagination.pageSize}
            buildHref={buildPageHref}
          />
        </div>
      )}
    </div>
  );
}
