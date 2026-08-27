import type { ReturnReason, ReturnStatus } from "./constants";
import { RETURN_REASONS, RETURN_STATUSES } from "./constants";

export interface MetricsSourceRecord {
  status: string;
  reason: string;
  receivedDate: Date;
  completedDate: Date | null;
}

export interface StatusCount {
  status: ReturnStatus;
  count: number;
}

export interface ReasonCount {
  reason: ReturnReason;
  count: number;
}

export interface DashboardMetrics {
  total: number;
  byStatus: StatusCount[];
  byReason: ReasonCount[];
  averageProcessingDays: number | null;
  completedCount: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Computes dashboard aggregates from a flat list of return records. Pure
 * function so it can be unit-tested without a database.
 */
export function computeMetrics(records: MetricsSourceRecord[]): DashboardMetrics {
  const statusCounts = new Map<string, number>();
  const reasonCounts = new Map<string, number>();
  let processingDaysSum = 0;
  let completedCount = 0;

  for (const record of records) {
    statusCounts.set(record.status, (statusCounts.get(record.status) ?? 0) + 1);
    reasonCounts.set(record.reason, (reasonCounts.get(record.reason) ?? 0) + 1);

    if (record.completedDate) {
      const days =
        (record.completedDate.getTime() - record.receivedDate.getTime()) /
        MS_PER_DAY;
      if (days >= 0) {
        processingDaysSum += days;
        completedCount += 1;
      }
    }
  }

  const byStatus: StatusCount[] = RETURN_STATUSES.map((status) => ({
    status,
    count: statusCounts.get(status) ?? 0,
  }));

  const byReason: ReasonCount[] = RETURN_REASONS.map((reason) => ({
    reason,
    count: reasonCounts.get(reason) ?? 0,
  })).sort((a, b) => b.count - a.count);

  return {
    total: records.length,
    byStatus,
    byReason,
    averageProcessingDays:
      completedCount > 0
        ? Math.round((processingDaysSum / completedCount) * 10) / 10
        : null,
    completedCount,
  };
}
