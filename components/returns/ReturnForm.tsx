"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  RETURN_REASONS,
  RETURN_STATUSES,
  REASON_LABELS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  type ReturnStatus,
} from "@/lib/constants";
import { Button, LinkButton } from "@/components/ui/Button";
import type { ReturnDto } from "@/lib/serialize";

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export interface ReturnFormValues {
  orderNumber: string;
  productName: string;
  sku: string;
  customerName: string;
  reason: string;
  status: string;
  receivedDate: string;
  completedDate: string;
  operatorNotes: string;
}

function emptyValues(): ReturnFormValues {
  return {
    orderNumber: "",
    productName: "",
    sku: "",
    customerName: "",
    reason: RETURN_REASONS[0],
    status: "RECEIVED",
    receivedDate: new Date().toISOString().slice(0, 10),
    completedDate: "",
    operatorNotes: "",
  };
}

function fromReturnDto(r: ReturnDto): ReturnFormValues {
  return {
    orderNumber: r.orderNumber,
    productName: r.productName,
    sku: r.sku,
    customerName: r.customerName,
    reason: r.reason,
    status: r.status,
    receivedDate: toDateInputValue(r.receivedDate),
    completedDate: toDateInputValue(r.completedDate),
    operatorNotes: r.operatorNotes ?? "",
  };
}

interface ApiIssue {
  path: (string | number)[];
  message: string;
}

/** Which statuses are legal to select right now, given the record's current status. */
function allowedStatusOptions(current: ReturnStatus): ReturnStatus[] {
  const forward = STATUS_TRANSITIONS[current];
  return [current, ...forward.filter((s) => s !== current)];
}

export function ReturnForm({ existing }: { existing?: ReturnDto }) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [values, setValues] = useState<ReturnFormValues>(
    existing ? fromReturnDto(existing) : emptyValues()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const statusOptions = isEdit
    ? allowedStatusOptions(existing!.status as ReturnStatus)
    : RETURN_STATUSES;

  function set<K extends keyof ReturnFormValues>(key: K, value: ReturnFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const payload = {
      orderNumber: values.orderNumber,
      productName: values.productName,
      sku: values.sku,
      customerName: values.customerName,
      reason: values.reason,
      status: values.status,
      receivedDate: values.receivedDate,
      completedDate: values.completedDate || null,
      operatorNotes: values.operatorNotes || null,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/returns/${existing!.id}` : "/api/returns",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json();

      if (!res.ok) {
        if (Array.isArray(body.issues)) {
          const next: Record<string, string> = {};
          for (const issue of body.issues as ApiIssue[]) {
            const key = issue.path.join(".");
            if (key && !next[key]) next[key] = issue.message;
          }
          setFieldErrors(next);
        }
        setFormError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const id = body.data.id as string;
      router.push(`/returns/${id}`);
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Field id="orderNumber" label="Order number" error={fieldErrors.orderNumber}>
          <input
            id="orderNumber"
            required
            maxLength={40}
            value={values.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
            className={inputClass(fieldErrors.orderNumber)}
          />
        </Field>

        <Field id="sku" label="SKU" error={fieldErrors.sku}>
          <input
            id="sku"
            required
            maxLength={60}
            value={values.sku}
            onChange={(e) => set("sku", e.target.value)}
            className={inputClass(fieldErrors.sku)}
          />
        </Field>

        <Field
          id="productName"
          label="Product name"
          error={fieldErrors.productName}
          className="sm:col-span-2"
        >
          <input
            id="productName"
            required
            maxLength={200}
            value={values.productName}
            onChange={(e) => set("productName", e.target.value)}
            className={inputClass(fieldErrors.productName)}
          />
        </Field>

        <Field id="customerName" label="Customer name" error={fieldErrors.customerName}>
          <input
            id="customerName"
            required
            maxLength={120}
            value={values.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            className={inputClass(fieldErrors.customerName)}
          />
        </Field>

        <Field id="reason" label="Reason" error={fieldErrors.reason}>
          <select
            id="reason"
            value={values.reason}
            onChange={(e) => set("reason", e.target.value)}
            className={inputClass(fieldErrors.reason)}
          >
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="status" label="Status" error={fieldErrors.status}>
          <select
            id="status"
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass(fieldErrors.status)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="mt-1 text-xs text-slate-500">
              Only valid workflow transitions from the current status are shown.
            </p>
          )}
        </Field>

        <Field id="receivedDate" label="Received date" error={fieldErrors.receivedDate}>
          <input
            id="receivedDate"
            required
            type="date"
            value={values.receivedDate}
            onChange={(e) => set("receivedDate", e.target.value)}
            className={inputClass(fieldErrors.receivedDate)}
          />
        </Field>

        <Field id="completedDate" label="Completed date" error={fieldErrors.completedDate}>
          <input
            id="completedDate"
            type="date"
            value={values.completedDate}
            onChange={(e) => set("completedDate", e.target.value)}
            className={inputClass(fieldErrors.completedDate)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Required once status is Completed. Auto-filled if left blank.
          </p>
        </Field>

        <Field
          id="operatorNotes"
          label="Operator notes"
          error={fieldErrors.operatorNotes}
          className="sm:col-span-2"
        >
          <textarea
            id="operatorNotes"
            rows={3}
            maxLength={2000}
            value={values.operatorNotes}
            onChange={(e) => set("operatorNotes", e.target.value)}
            className={inputClass(fieldErrors.operatorNotes)}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create return"}
        </Button>
        <LinkButton
          href={isEdit ? `/returns/${existing!.id}` : "/returns"}
          variant="secondary"
        >
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}

function inputClass(error?: string): string {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
      : "border-slate-300 focus:border-slate-500 focus:ring-slate-500"
  }`;
}

function Field({
  id,
  label,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
