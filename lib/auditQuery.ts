import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { AUDIT_ACTIONS } from "@/lib/auditActions";

// Shared query logic for the audit trail, used by both the ADMIN audit page
// (a Server Component) and `GET /api/audit`.

export { AUDIT_ACTIONS };

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(100).optional(),
  actor: z.string().trim().max(200).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorEmail: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
}

export interface ListAuditResult {
  data: AuditLogDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function buildAuditWhere(q: AuditQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (q.action) where.action = q.action;
  if (q.entityType) where.entityType = { equals: q.entityType, mode: "insensitive" };
  if (q.entityId) where.entityId = q.entityId;
  if (q.actor) where.actorEmail = { contains: q.actor, mode: "insensitive" };

  if (q.dateFrom || q.dateTo) {
    where.createdAt = {};
    if (q.dateFrom) where.createdAt.gte = q.dateFrom;
    if (q.dateTo) {
      // treat dateTo as inclusive of the whole day
      const end = new Date(q.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return where;
}

export async function listAuditLogs(q: AuditQuery): Promise<ListAuditResult> {
  const where = buildAuditWhere(q);
  const skip = (q.page - 1) * q.pageSize;

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: q.pageSize,
    }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      actorRole: r.actorRole,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    },
  };
}
