import { prisma } from "@/lib/prisma";
import { computeMetrics, type DashboardMetrics } from "@/lib/metrics";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBarChart } from "@/components/dashboard/StatusBarChart";
import { ReasonBarChart } from "@/components/dashboard/ReasonBarChart";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics: DashboardMetrics;
  try {
    const records = await prisma.return.findMany({
      select: { status: true, reason: true, receivedDate: true, completedDate: true },
    });
    metrics = computeMetrics(records);
  } catch {
    return (
      <div>
        <PageHeader title="Dashboard" description="Operational overview of returns activity." />
        <ErrorState description="Could not load dashboard metrics. Check that the database is set up (see README)." />
      </div>
    );
  }

  if (metrics.total === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Operational overview of returns activity." />
        <EmptyState
          title="No returns yet"
          description="Seed demo data or create your first return to see metrics here."
          action={
            <div className="flex gap-2">
              <LinkButton href="/returns/new">New return</LinkButton>
              <LinkButton href="/returns/import" variant="secondary">
                Import CSV
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  const openCount =
    metrics.total -
    (metrics.byStatus.find((s) => s.status === "COMPLETED")?.count ?? 0) -
    (metrics.byStatus.find((s) => s.status === "REJECTED")?.count ?? 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview of returns activity."
        actions={<LinkButton href="/returns/new">New return</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total returns" value={metrics.total.toLocaleString()} />
        <StatCard
          label="Open / in progress"
          value={openCount.toLocaleString()}
          hint="Not yet completed or rejected"
        />
        <StatCard
          label="Completed"
          value={(metrics.byStatus.find((s) => s.status === "COMPLETED")?.count ?? 0).toLocaleString()}
        />
        <StatCard
          label="Avg. processing time"
          value={
            metrics.averageProcessingDays !== null
              ? `${metrics.averageProcessingDays} days`
              : "—"
          }
          hint={
            metrics.averageProcessingDays !== null
              ? `Across ${metrics.completedCount} completed returns`
              : "No completed returns yet"
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Returns by status</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Current distribution across the {Object.keys(STATUS_LABELS).length}-stage workflow.
          </p>
          <div className="mt-2">
            <StatusBarChart data={metrics.byStatus} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Most common reasons</h2>
          <p className="mt-0.5 text-xs text-slate-500">Ranked by number of returns.</p>
          <div className="mt-2">
            <ReasonBarChart data={metrics.byReason} />
          </div>
        </div>
      </div>
    </div>
  );
}
