import { describe, expect, it } from "vitest";
import { isValidTransition } from "./constants";

describe("isValidTransition", () => {
  it("allows staying in the same status", () => {
    expect(isValidTransition("RECEIVED", "RECEIVED")).toBe(true);
  });

  it("allows the standard forward path", () => {
    expect(isValidTransition("RECEIVED", "INSPECTING")).toBe(true);
    expect(isValidTransition("INSPECTING", "APPROVED")).toBe(true);
    expect(isValidTransition("INSPECTING", "REJECTED")).toBe(true);
    expect(isValidTransition("APPROVED", "COMPLETED")).toBe(true);
    expect(isValidTransition("REJECTED", "COMPLETED")).toBe(true);
  });

  it("allows reverting APPROVED back to INSPECTING", () => {
    expect(isValidTransition("APPROVED", "INSPECTING")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(isValidTransition("RECEIVED", "APPROVED")).toBe(false);
    expect(isValidTransition("RECEIVED", "COMPLETED")).toBe(false);
  });

  it("treats COMPLETED and REJECTED as terminal (except no-op)", () => {
    expect(isValidTransition("COMPLETED", "RECEIVED")).toBe(false);
    expect(isValidTransition("REJECTED", "INSPECTING")).toBe(false);
  });
});
