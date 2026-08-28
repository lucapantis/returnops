import { describe, expect, it } from "vitest";
import {
  LOCK_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  isLocked,
  registerFailure,
  registerSuccess,
} from "./lockout";

const now = new Date("2026-08-28T12:00:00Z");

describe("account lockout", () => {
  it("is not locked with no lock timestamp", () => {
    expect(isLocked({ failedLoginAttempts: 3, lockedUntil: null }, now)).toBe(false);
  });

  it("is locked while lockedUntil is in the future, unlocked once it passes", () => {
    const future = new Date(now.getTime() + 60_000);
    const past = new Date(now.getTime() - 1);
    expect(isLocked({ failedLoginAttempts: 0, lockedUntil: future }, now)).toBe(true);
    expect(isLocked({ failedLoginAttempts: 0, lockedUntil: past }, now)).toBe(false);
  });

  it("counts failures up to the threshold, then locks and resets the counter", () => {
    let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      state = registerFailure(state, now);
      expect(state.failedLoginAttempts).toBe(i);
      expect(state.lockedUntil).toBeNull();
    }
    state = registerFailure(state, now);
    expect(state.failedLoginAttempts).toBe(0);
    expect(state.lockedUntil).toEqual(new Date(now.getTime() + LOCK_DURATION_MS));
    expect(isLocked(state, now)).toBe(true);
  });

  it("a successful login clears both counters", () => {
    expect(registerSuccess()).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });
});
