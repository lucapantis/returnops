// Pure, client-safe audit vocabulary. Kept separate from `lib/auditQuery.ts`
// (which pulls in the Prisma client) so client components — the audit filter
// bar — can import the action list without dragging the database layer into
// the browser bundle.

export const AUDIT_ACTIONS = [
  "return.create",
  "return.update",
  "return.status_change",
  "return.csv_import",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "return.create": "Return created",
  "return.update": "Return edited",
  "return.status_change": "Status changed",
  "return.csv_import": "CSV import",
};
