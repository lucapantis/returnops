import type { Role } from "@/lib/auth/permissions";

// Pure helper for the seed's account upsert. Extracted so the "never silently
// overwrite an existing account's credentials" rule can be unit tested without
// a database.

export interface SeedAccountSpec {
  email: string;
  name: string;
  role: Role;
}

export interface UserUpsertPayload {
  create: {
    email: string;
    name: string;
    role: Role;
    passwordHash: string;
    isActive: true;
  };
  update:
    | { name: string; role: Role }
    | { name: string; role: Role; passwordHash: string; isActive: true };
}

/**
 * Build the Prisma `upsert` payload for one managed seed account.
 *
 * - On **create**, the account is provisioned with the `.env` password and
 *   `isActive: true`.
 * - On **update** (the account already exists), only the display name and role
 *   are refreshed. The password hash and the `isActive` flag are left untouched
 *   so re-running the seed can never reset a rotated password or silently
 *   re-enable an account an administrator has deliberately disabled.
 * - Set `resetCredentials: true` (env `SEED_RESET_CREDENTIALS=true`) to force the
 *   password and active flag back to the `.env` baseline — used only when
 *   deliberately rotating the demo credentials.
 */
export function buildUserUpsert(
  spec: SeedAccountSpec,
  passwordHash: string,
  { resetCredentials = false }: { resetCredentials?: boolean } = {}
): UserUpsertPayload {
  return {
    create: {
      email: spec.email,
      name: spec.name,
      role: spec.role,
      passwordHash,
      isActive: true,
    },
    update: resetCredentials
      ? { name: spec.name, role: spec.role, passwordHash, isActive: true }
      : { name: spec.name, role: spec.role },
  };
}
