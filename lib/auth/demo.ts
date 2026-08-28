import "server-only";
import type { Role } from "@/lib/auth/permissions";

// The public portfolio demo account.
//
// It is a normal `User` row with the VIEWER role, identified *only* by its
// email matching the server-side `DEMO_USER_EMAIL`. Nothing about the demo
// account is baked into the client bundle: the credentials live in server-only
// env vars, and the login page merely renders a "Try demo" button whose action
// runs entirely on the server (see `app/login/actions.ts`).
//
// A demo session is additionally clamped in `lib/auth/guard.ts`:
//   - the role is forced to VIEWER regardless of the database row, and
//   - `can()` is called with `{ isDemo: true }`, which narrows the grant to
//     `DEMO_PERMISSIONS` (read-only, no export, no mutations, no audit).

/** The role every demo account must have. */
export const DEMO_ROLE: Role = "VIEWER";

/** Normalised `DEMO_USER_EMAIL`, or `null` when it isn't configured. */
export function demoUserEmail(): string | null {
  const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  return email ? email : null;
}

/** Display name for the demo account (provisioning + docs use this default). */
export function demoUserName(): string {
  return process.env.DEMO_USER_NAME?.trim() || "ReturnOps Demo (viewer)";
}

/**
 * True when the public "Try demo" button should be shown — i.e. both the demo
 * email and password are present server-side.
 */
export function isDemoLoginConfigured(): boolean {
  return Boolean(demoUserEmail() && process.env.DEMO_USER_PASSWORD);
}

/** True when `email` is the configured demo account. */
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = demoUserEmail();
  if (!demo || !email) return false;
  return email.trim().toLowerCase() === demo;
}
