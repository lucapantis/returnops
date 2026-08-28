import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeReturn } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge, ReasonBadge } from "@/components/ui/Badge";
import { StatusWorkflowActions } from "@/components/returns/StatusWorkflowActions";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.return.findUnique({ where: { id } });

  if (!record) {
    notFound();
  }

  const r = serializeReturn(record);

  return (
    <div>
      <PageHeader
        title={r.returnRef}
        description={`Order ${r.orderNumber}`}
        actions={
          <>
            <LinkButton href="/returns" variant="secondary">
              Back to returns
            </LinkButton>
            <LinkButton href={`/returns/${r.id}/edit`}>Edit</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Return details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Product name" value={r.productName} />
              <Detail label="SKU" value={r.sku} />
              <Detail label="Customer" value={r.customerName} />
              <Detail label="Order number" value={r.orderNumber} />
              <Detail label="Reason" value={<ReasonBadge reason={r.reason} />} />
              <Detail label="Status" value={<StatusBadge status={r.status} />} />
              <Detail label="Received date" value={formatDate(r.receivedDate)} />
              <Detail label="Completed date" value={formatDate(r.completedDate)} />
            </dl>
            {r.operatorNotes && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Operator notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {r.operatorNotes}
                </dd>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
            Created {formatDateTime(r.createdAt)} · Last updated {formatDateTime(r.updatedAt)}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Advance workflow</h2>
            <StatusWorkflowActions id={r.id} status={r.status} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
