import { describe, expect, it } from "vitest";
import { buildDemoUserUpsert, buildUserUpsert } from "./seedAccounts";

const spec = {
  email: "admin@returnops.local",
  name: "ReturnOps Admin",
  role: "ADMIN" as const,
};

describe("buildUserUpsert", () => {
  it("provisions a new account with the .env password and active", () => {
    const { create } = buildUserUpsert(spec, "HASH");
    expect(create).toEqual({
      email: "admin@returnops.local",
      name: "ReturnOps Admin",
      role: "ADMIN",
      passwordHash: "HASH",
      isActive: true,
    });
  });

  it("on re-seed refreshes only name + role, never the password or isActive", () => {
    const { update } = buildUserUpsert(spec, "HASH");
    expect(update).toEqual({ name: "ReturnOps Admin", role: "ADMIN" });
    expect("passwordHash" in update).toBe(false);
    expect("isActive" in update).toBe(false);
  });

  it("only resets credentials when explicitly opted in", () => {
    const { update } = buildUserUpsert(spec, "HASH", { resetCredentials: true });
    expect(update).toEqual({
      name: "ReturnOps Admin",
      role: "ADMIN",
      passwordHash: "HASH",
      isActive: true,
    });
  });
});

describe("buildDemoUserUpsert", () => {
  const demoSpec = { email: "demo@returnops.local", name: "ReturnOps Demo (viewer)" };

  it("creates the demo account as an active VIEWER", () => {
    const { create } = buildDemoUserUpsert(demoSpec, "HASH");
    expect(create).toEqual({
      email: "demo@returnops.local",
      name: "ReturnOps Demo (viewer)",
      role: "VIEWER",
      passwordHash: "HASH",
      isActive: true,
    });
  });

  it("on re-provision forces the row back to an active VIEWER with the current password", () => {
    const { update } = buildDemoUserUpsert(demoSpec, "HASH");
    expect(update).toEqual({
      name: "ReturnOps Demo (viewer)",
      role: "VIEWER",
      passwordHash: "HASH",
      isActive: true,
    });
  });

  it("never emits any role other than VIEWER", () => {
    const payload = buildDemoUserUpsert(demoSpec, "HASH");
    expect(payload.create.role).toBe("VIEWER");
    expect(payload.update.role).toBe("VIEWER");
  });
});
