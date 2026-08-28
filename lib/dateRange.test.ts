import { describe, expect, it } from "vitest";
import { endOfDayUtc } from "./dateRange";

describe("endOfDayUtc", () => {
  it("moves a midnight-UTC date to the last millisecond of the same UTC day", () => {
    const result = endOfDayUtc(new Date("2026-08-28T00:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-08-28T23:59:59.999Z");
  });

  it("does not mutate the input date", () => {
    const input = new Date("2026-08-28T00:00:00.000Z");
    endOfDayUtc(input);
    expect(input.toISOString()).toBe("2026-08-28T00:00:00.000Z");
  });

  it("keeps a record received later that day within an inclusive range", () => {
    const upperBound = endOfDayUtc(new Date("2026-08-28T00:00:00.000Z"));
    const receivedThatAfternoon = new Date("2026-08-28T15:30:00.000Z");
    expect(receivedThatAfternoon.getTime()).toBeLessThanOrEqual(upperBound.getTime());
  });
});
