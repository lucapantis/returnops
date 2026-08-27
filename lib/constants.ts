// Central definitions for the return workflow's fixed vocabularies.
// Stored as plain TEXT columns in SQLite (no native enum support), validated
// at the application boundary via the Zod schemas in `lib/validation.ts`.

export const RETURN_STATUSES = [
  "RECEIVED",
  "INSPECTING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DEFECTIVE",
  "SIZE_FIT",
  "OTHER",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export const STATUS_LABELS: Record<ReturnStatus, string> = {
  RECEIVED: "Received",
  INSPECTING: "Inspecting",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export const REASON_LABELS: Record<ReturnReason, string> = {
  DAMAGED: "Damaged in transit",
  WRONG_ITEM: "Wrong item shipped",
  NOT_AS_DESCRIBED: "Not as described",
  NO_LONGER_NEEDED: "No longer needed",
  DEFECTIVE: "Defective / faulty",
  SIZE_FIT: "Size or fit issue",
  OTHER: "Other",
};

// Allowed forward transitions for the return workflow. COMPLETED and
// REJECTED are terminal; APPROVED can still be reverted to INSPECTING if an
// operator needs to re-examine an item before completion.
export const STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  RECEIVED: ["INSPECTING"],
  INSPECTING: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED", "INSPECTING"],
  REJECTED: ["COMPLETED"],
  COMPLETED: [],
};

export function isValidTransition(
  from: ReturnStatus,
  to: ReturnStatus
): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from].includes(to);
}

export const STATUS_BADGE_CLASSES: Record<ReturnStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-600/20",
  INSPECTING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const PAGE_SIZE = 10;
