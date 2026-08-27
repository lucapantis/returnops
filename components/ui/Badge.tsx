import { REASON_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/constants";
import type { ReturnReason, ReturnStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const known = STATUS_BADGE_CLASSES[status as ReturnStatus] as string | undefined;
  const label = STATUS_LABELS[status as ReturnStatus] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        known ?? "bg-slate-100 text-slate-700 ring-slate-600/20"
      }`}
    >
      {label}
    </span>
  );
}

export function ReasonBadge({ reason }: { reason: string }) {
  const label = REASON_LABELS[reason as ReturnReason] ?? reason;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      {label}
    </span>
  );
}
