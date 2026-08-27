import Link from "next/link";
import { StatusBadge, ReasonBadge } from "@/components/ui/Badge";
import type { ReturnDto } from "@/lib/serialize";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReturnsTable({ returns }: { returns: ReturnDto[] }) {
  return (
    <div className="overflow-x-auto bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Return ref</Th>
            <Th>Order #</Th>
            <Th>Product</Th>
            <Th>Customer</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th>Received</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {returns.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                <Link href={`/returns/${r.id}`} className="hover:underline">
                  {r.returnRef}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.orderNumber}</td>
              <td className="max-w-[220px] truncate px-4 py-3 text-slate-600" title={r.productName}>
                {r.productName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.customerName}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <ReasonBadge reason={r.reason} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {formatDate(r.receivedDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}
