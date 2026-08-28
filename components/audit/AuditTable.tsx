import Link from "next/link";
import type { AuditLogDto } from "@/lib/auditQuery";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";

const ACTION_LABELS: Record<string, string> = {
  "return.create": "Return created",
  "return.update": "Return edited",
  "return.status_change": "Status changed",
  "return.csv_import": "CSV import",
};

const ACTION_CLASSES: Record<string, string> = {
  "return.create": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "return.update": "bg-blue-50 text-blue-700 ring-blue-600/20",
  "return.status_change": "bg-amber-50 text-amber-700 ring-amber-600/20",
  "return.csv_import": "bg-purple-50 text-purple-700 ring-purple-600/20",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditTable({ rows }: { rows: AuditLogDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">When</th>
            <th scope="col" className="px-4 py-3">Actor</th>
            <th scope="col" className="px-4 py-3">Action</th>
            <th scope="col" className="px-4 py-3">Entity</th>
            <th scope="col" className="px-4 py-3">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{r.actorEmail}</div>
                {r.actorRole && (
                  <div className="text-xs text-slate-500">
                    {ROLE_LABELS[r.actorRole as Role] ?? r.actorRole}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    ACTION_CLASSES[r.action] ?? "bg-slate-100 text-slate-700 ring-slate-600/20"
                  }`}
                >
                  {ACTION_LABELS[r.action] ?? r.action}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="text-slate-700">{r.entityType}</div>
                {r.action === "return.csv_import" ? (
                  <span className="font-mono text-xs text-slate-400">{r.entityId}</span>
                ) : (
                  <Link
                    href={`/returns/${r.entityId}`}
                    className="font-mono text-xs text-slate-500 hover:text-slate-900 hover:underline"
                  >
                    {r.entityId}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3">
                <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {r.metadata ? JSON.stringify(r.metadata, null, 2) : "—"}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
