import { describe, expect, it } from "vitest";
import { computeMetrics, type MetricsSourceRecord } from "./metrics";

function record(overrides: Partial<MetricsSourceRecord>): MetricsSourceRecord {
  return {
    status: "RECEIVED",
    reason: "DAMAGED",
    receivedDate: new Date("2026-01-01"),
    completedDate: null,
    ...overrides,
  };
}

describe("computeMetrics", () => {
  it("returns zeroed metrics for an empty dataset", () => {
    const metrics = computeMetrics([]);
    expect(metrics.total).toBe(0);
    expect(metrics.averageProcessingDays).toBeNull();
    expect(metrics.byStatus.every((s) => s.count === 0)).toBe(true);
  });

  it("counts total and per-status records", () => {
    const metrics = computeMetrics([
      record({ status: "RECEIVED" }),
      record({ status: "RECEIVED" }),
      record({ status: "COMPLETED" }),
    ]);
    expect(metrics.total).toBe(3);
    expect(metrics.byStatus.find((s) => s.status === "RECEIVED")?.count).toBe(2);
    expect(metrics.byStatus.find((s) => s.status === "COMPLETED")?.count).toBe(1);
  });

  it("sorts reasons by descending count", () => {
    const metrics = computeMetrics([
      record({ reason: "SIZE_FIT" }),
      record({ reason: "DAMAGED" }),
      record({ reason: "DAMAGED" }),
    ]);
    expect(metrics.byReason[0]).toEqual({ reason: "DAMAGED", count: 2 });
  });

  it("computes average processing days across completed returns only", () => {
    const metrics = computeMetrics([
      record({
        status: "COMPLETED",
        receivedDate: new Date("2026-01-01T00:00:00Z"),
        completedDate: new Date("2026-01-03T00:00:00Z"),
      }),
      record({
        status: "COMPLETED",
        receivedDate: new Date("2026-01-01T00:00:00Z"),
        completedDate: new Date("2026-01-05T00:00:00Z"),
      }),
      record({ status: "RECEIVED", completedDate: null }),
    ]);
    expect(metrics.completedCount).toBe(2);
    expect(metrics.averageProcessingDays).toBe(3); // (2 + 4) / 2
  });

  it("ignores negative processing windows (data anomalies)", () => {
    const metrics = computeMetrics([
      record({
        status: "COMPLETED",
        receivedDate: new Date("2026-01-05T00:00:00Z"),
        completedDate: new Date("2026-01-01T00:00:00Z"),
      }),
    ]);
    expect(metrics.completedCount).toBe(0);
    expect(metrics.averageProcessingDays).toBeNull();
  });
});
