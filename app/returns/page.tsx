import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ReturnsFilters } from "@/components/returns/ReturnsFilters";
import { ReturnsTable } from "@/components/returns/ReturnsTable";
import { Pagination } from "@/components/returns/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { listReturns, type ListReturnsResult } from "@/lib/returnsQuery";
import { listReturnsQuerySchema } from "@/lib/validation";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryRecord(raw: SearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.length > 0) record[key] = value;
    else if (Array.isArray(value) && value[0]) record[key] = value[0];
  }
  return record;
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const queryRecord = toQueryRecord(raw);
  const parsed = listReturnsQuerySchema.safeParse(queryRecord);

  if (!parsed.success) {
    return (
      <div>
        <PageHeader title="Returns" description="Search, filter and manage return records." />
        <ErrorState description="These filters aren't valid. Try clearing them and starting again." />
      </div>
    );
  }

  let result: ListReturnsResult;
  try {
    result = await listReturns(parsed.data);
  } catch {
    return (
      <div>
        <PageHeader title="Returns" description="Search, filter and manage return records." />
        <ErrorState description="Could not load returns. Check that the database is set up (see README)." />
      </div>
    );
  }

  const exportParams = new URLSearchParams(queryRecord);
  const exportHref = `/api/returns/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(queryRecord);
    params.set("page", String(page));
    return `/returns?${params.toString()}`;
  };

  const hasAnyReturnsAtAll = result.pagination.total > 0 || Object.keys(queryRecord).length > 0;

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Search, filter and manage return records."
        actions={
          <>
            <LinkButton href={exportHref} variant="secondary">
              Export CSV
            </LinkButton>
            <LinkButton href="/returns/import" variant="secondary">
              Import CSV
            </LinkButton>
            <LinkButton href="/returns/new">New return</LinkButton>
          </>
        }
      />

      <div className="mb-4">
        <ReturnsFilters />
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          title={hasAnyReturnsAtAll ? "No matching returns" : "No returns yet"}
          description={
            hasAnyReturnsAtAll
              ? "Try adjusting or clearing your filters."
              : "Create your first return or import a CSV to get started."
          }
          action={
            !hasAnyReturnsAtAll ? (
              <div className="flex gap-2">
                <LinkButton href="/returns/new">New return</LinkButton>
                <LinkButton href="/returns/import" variant="secondary">
                  Import CSV
                </LinkButton>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ReturnsTable returns={result.data} />
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
