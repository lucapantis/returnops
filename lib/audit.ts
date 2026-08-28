import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import type { Role } from "@/lib/auth/permissions";
import type { AuditAction } from "@/lib/auditActions";

// Append-only audit trail. Every successful create / edit / status-change /
// CSV-import writes one row here, in the same transaction as the business
// mutation. The database also rejects UPDATE/DELETE on this table (see the
// migration) so the trail can't be rewritten after the fact.

export type { AuditAction };

export interface AuditActor {
  id: string;
  email: string;
  role: Role;
}

export interface AuditInput {
  actor: AuditActor;
  action: AuditAction;
  entityType: "Return";
  entityId: string;
  /**
   * A small, safe before/after snapshot. Passed through `redactMetadata`
   * before it is stored: keys that look like secrets are dropped, long
   * strings are truncated and large collections are capped, so passwords,
   * tokens and full CSV payloads can never land in the trail.
   */
  metadata?: Record<string, unknown>;
}

// Anything whose key matches this is removed from stored metadata entirely.
const SENSITIVE_KEY = /pass|secret|token|hash|cookie|authorization|csv|\bkey\b/i;

const MAX_STRING = 500;
const MAX_ARRAY = 50;
const MAX_DEPTH = 6;

export function redactMetadata(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated: max depth]";

  if (typeof value === "string") {
    return value.length > MAX_STRING
      ? `${value.slice(0, MAX_STRING)}… [truncated ${value.length - MAX_STRING} chars]`
      : value;
  }

  if (value === null || typeof value !== "object") return value;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const capped = value.slice(0, MAX_ARRAY).map((v) => redactMetadata(v, depth + 1));
    if (value.length > MAX_ARRAY) capped.push(`… [${value.length - MAX_ARRAY} more]`);
    return capped;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = redactMetadata(v, depth + 1);
  }
  return out;
}

/** Prisma `create` args for one audit row — reusable inside `$transaction([...])`. */
export function auditCreateArgs(input: AuditInput): Prisma.AuditLogCreateArgs {
  const metadata = input.metadata
    ? (redactMetadata(input.metadata) as Prisma.InputJsonValue)
    : undefined;

  return {
    data: {
      actorId: input.actor.id,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  };
}

type AuditCapableClient = Pick<PrismaClient, "auditLog"> | Prisma.TransactionClient;

/**
 * Write one audit row. Pass a transaction client (`tx`) so the audit entry and
 * the business mutation commit or roll back together.
 */
export function recordAudit(db: AuditCapableClient, input: AuditInput) {
  return db.auditLog.create(auditCreateArgs(input));
}
