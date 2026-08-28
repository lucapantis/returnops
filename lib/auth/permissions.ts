// The single source of truth for role-based authorization.
//
// Authorization is *default-deny*: `can()` returns true only when the role is
// explicitly listed for that permission below. Anything unrecognised — an
// unknown permission string, a malformed role — is denied.
//
// This module is intentionally free of server-only imports so it can be reused
// in client components (to hide actions a user can't perform) while the real
// enforcement happens server-side against the same table.

export const ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Viewer-level: read-only access to returns data and safe CSV export.
  "returns:read",
  "returns:export",
  // Operator-level: mutations.
  "returns:create",
  "returns:edit",
  "returns:transition",
  "returns:import",
  // Admin-level: the audit trail.
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const VIEWER_PERMISSIONS: Permission[] = ["returns:read", "returns:export"];

const OPERATOR_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  "returns:create",
  "returns:edit",
  "returns:transition",
  "returns:import",
];

const ADMIN_PERMISSIONS: Permission[] = [...OPERATOR_PERMISSIONS, "audit:read"];

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  VIEWER: new Set(VIEWER_PERMISSIONS),
  OPERATOR: new Set(OPERATOR_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
};

/** True only if `role` is explicitly granted `permission`. Default deny. */
export function can(role: unknown, permission: Permission): boolean {
  if (typeof role !== "string") return false;
  const grants = MATRIX[role as Role];
  return grants ? grants.has(permission) : false;
}

/** Every permission a role holds — handy for tests and debugging. */
export function permissionsFor(role: Role): Permission[] {
  return [...(MATRIX[role] ?? new Set<Permission>())];
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Operator",
  VIEWER: "Viewer",
};

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  ADMIN: "bg-purple-50 text-purple-700 ring-purple-600/20",
  OPERATOR: "bg-blue-50 text-blue-700 ring-blue-600/20",
  VIEWER: "bg-slate-100 text-slate-700 ring-slate-600/20",
};
