"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_LABELS, STATUS_TRANSITIONS, type ReturnStatus } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const TARGET_VARIANT: Record<ReturnStatus, "primary" | "danger" | "secondary"> = {
  RECEIVED: "secondary",
  INSPECTING: "primary",
  APPROVED: "primary",
  REJECTED: "danger",
  COMPLETED: "primary",
};

export function StatusWorkflowActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = status as ReturnStatus;
  const targets = STATUS_TRANSITIONS[from] ?? [];

  if (targets.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {STATUS_LABELS[from] ?? status} is a final state for this workflow.
      </p>
    );
  }

  async function moveTo(target: ReturnStatus) {
    setPending(target);
    setError(null);
    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not update status.");
        setPending(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <Button
            key={target}
            variant={TARGET_VARIANT[target]}
            disabled={pending !== null}
            onClick={() => moveTo(target)}
          >
            {pending === target ? "Updating..." : `Move to ${STATUS_LABELS[target]}`}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
