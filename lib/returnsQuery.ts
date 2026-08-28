import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "./prisma";
import { serializeReturn, type ReturnDto } from "./serialize";
import type { ListReturnsQuery } from "./validation";
import { endOfDayUtc } from "./dateRange";

export function buildReturnsWhere(
  query: Pick<ListReturnsQuery, "search" | "status" | "reason" | "dateFrom" | "dateTo">
): Prisma.ReturnWhereInput {
  const where: Prisma.ReturnWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.reason) where.reason = query.reason;

  if (query.dateFrom || query.dateTo) {
    where.receivedDate = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      // A "YYYY-MM-DD" dateTo coerces to that day at 00:00, which would
      // exclude every record received later that same day. Treat the range
      // as inclusive of the whole end day.
      ...(query.dateTo ? { lte: endOfDayUtc(query.dateTo) } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { returnRef: { contains: query.search } },
      { orderNumber: { contains: query.search } },
      { productName: { contains: query.search } },
      { customerName: { contains: query.search } },
      { sku: { contains: query.search } },
    ];
  }

  return where;
}

export interface ListReturnsResult {
  data: ReturnDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Shared query used by both the `/api/returns` route and the returns page (server component). */
export async function listReturns(query: ListReturnsQuery): Promise<ListReturnsResult> {
  const where = buildReturnsWhere(query);

  const [total, records] = await Promise.all([
    prisma.return.count({ where }),
    prisma.return.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: records.map(serializeReturn),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
