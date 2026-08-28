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

// The public portfolio demo account is a VIEWER with an even narrower grant:
// it can read the (fictional) returns data and nothing else — no CSV export,
// no mutations, no audit. Enforced server-side in `lib/auth/guard.ts` and
// mirrored in the UI through the session's `isDemo` flag. See `lib/auth/demo.ts`.
export const DEMO_PERMISSIONS: readonly Permission[] = ["returns:read"];
const DEMO_SET: ReadonlySet<Permission> = new Set(DEMO_PERMISSIONS);

/**
 * True only if `role` is explicitly granted `permission`. Default deny.
 *
 * Pass `{ isDemo: true }` for a demo session: the grant is then intersected
 * with `DEMO_PERMISSIONS`, so a demo VIEWER loses even `returns:export`.
 */
export function can(
  role: unknown,
  permission: Permission,
  opts?: { isDemo?: boolean }
): boolean {
  if (typeof role !== "string") return false;
  const grants = MATRIX[role as Role];
  if (!grants || !grants.has(permission)) return false;
  if (opts?.isDemo) return DEMO_SET.has(permission);
  return true;
}

/** Every permission a role holds — handy for tests and debugging. */
export function permissionsFor(
  role: Role,
  opts?: { isDemo?: boolean }
): Permission[] {
  const grants = [...(MATRIX[role] ?? new Set<Permission>())];
  return opts?.isDemo ? grants.filter((p) => DEMO_SET.has(p)) : grants;
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
