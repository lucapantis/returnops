import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission, type Role } from "@/lib/auth/permissions";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// ---------------------------------------------------------------------------
// Reading the session
// ---------------------------------------------------------------------------

/**
 * The signed-in user as carried by the session cookie (JWT). Cheap: no
 * database call. `cache()` dedupes it within a single render / request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? u.email, role: u.role };
});

/**
 * The user re-read from the database, including the *current* role and active
 * flag. Use this for sensitive mutations so a session minted before a role was
 * downgraded or an account disabled can't act on the stale claim.
 */
export const getFreshUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

// ---------------------------------------------------------------------------
// Page guards — redirect on failure
// ---------------------------------------------------------------------------

/** Require an authenticated user or redirect to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a specific permission for a page. Unauthenticated -> /login;
 * authenticated but not permitted -> /forbidden. Default deny.
 *
 * - `fresh: false` (default) checks the permission against the session claim.
 * - `fresh: true` re-loads the user from the database first — use it for pages
 *   that expose sensitive data (e.g. the audit log) so a downgraded role or a
 *   disabled account loses access immediately, not only when the JWT expires.
 */
export async function requirePermission(
  permission: Permission,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<SessionUser> {
  await requireUser();
  const user = fresh ? await getFreshUser() : await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user.role, permission)) redirect("/forbidden");
  return user;
}

// ---------------------------------------------------------------------------
// API-route guards — return a Response on failure
// ---------------------------------------------------------------------------

export type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403, message: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

/**
 * Enforce authentication + a permission inside an API route or server action.
 *
 * - `fresh: false` (default) checks the permission against the session claim —
 *   fine for reads.
 * - `fresh: true` re-loads the user from the database first — use it for every
 *   mutation so revoked permissions take effect immediately.
 */
export async function guard(
  permission: Permission,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<GuardResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return deny(401, "Authentication required");

  if (fresh) {
    const freshUser = await getFreshUser();
    if (!freshUser) {
      return deny(401, "Your session is no longer valid. Please sign in again.");
    }
    if (!can(freshUser.role, permission)) {
      return deny(403, "You do not have permission to perform this action");
    }
    return { ok: true, user: freshUser };
  }

  if (!can(sessionUser.role, permission)) {
    return deny(403, "You do not have permission to perform this action");
  }
  return { ok: true, user: sessionUser };
}
