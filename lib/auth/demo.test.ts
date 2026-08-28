import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `demo.ts` imports `server-only`; stub it so this can run under Vitest's node
// environment.
vi.mock("server-only", () => ({}));

import {
  demoUserEmail,
  demoUserName,
  isDemoEmail,
  isDemoLoginConfigured,
} from "./demo";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.DEMO_USER_EMAIL;
  delete process.env.DEMO_USER_PASSWORD;
  delete process.env.DEMO_USER_NAME;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("demoUserEmail", () => {
  it("returns null when unset or blank", () => {
    expect(demoUserEmail()).toBeNull();
    process.env.DEMO_USER_EMAIL = "   ";
    expect(demoUserEmail()).toBeNull();
  });

  it("normalises case and whitespace", () => {
    process.env.DEMO_USER_EMAIL = "  Demo@ReturnOps.LOCAL ";
    expect(demoUserEmail()).toBe("demo@returnops.local");
  });
});

describe("isDemoLoginConfigured", () => {
  it("is true only when both email and password are present", () => {
    expect(isDemoLoginConfigured()).toBe(false);
    process.env.DEMO_USER_EMAIL = "demo@returnops.local";
    expect(isDemoLoginConfigured()).toBe(false);
    process.env.DEMO_USER_PASSWORD = "a-strong-demo-password";
    expect(isDemoLoginConfigured()).toBe(true);
  });
});

describe("isDemoEmail", () => {
  beforeEach(() => {
    process.env.DEMO_USER_EMAIL = "demo@returnops.local";
  });

  it("matches case-insensitively, ignoring surrounding whitespace", () => {
    expect(isDemoEmail("demo@returnops.local")).toBe(true);
    expect(isDemoEmail("  DEMO@returnops.LOCAL  ")).toBe(true);
  });

  it("does not match other accounts", () => {
    expect(isDemoEmail("admin@returnops.local")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
  });

  it("never matches when no demo email is configured", () => {
    delete process.env.DEMO_USER_EMAIL;
    expect(isDemoEmail("demo@returnops.local")).toBe(false);
  });
});

describe("demoUserName", () => {
  it("falls back to a default", () => {
    expect(demoUserName()).toBe("ReturnOps Demo (viewer)");
    process.env.DEMO_USER_NAME = "Portfolio Demo";
    expect(demoUserName()).toBe("Portfolio Demo");
  });
});
