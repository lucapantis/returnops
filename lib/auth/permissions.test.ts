import { describe, expect, it } from "vitest";
import {
  can,
  permissionsFor,
  PERMISSIONS,
  DEMO_PERMISSIONS,
  type Permission,
} from "./permissions";

describe("permission matrix", () => {
  it("VIEWER can only read and export", () => {
    expect(can("VIEWER", "returns:read")).toBe(true);
    expect(can("VIEWER", "returns:export")).toBe(true);
    for (const p of ["returns:create", "returns:edit", "returns:transition", "returns:import", "audit:read"] as Permission[]) {
      expect(can("VIEWER", p)).toBe(false);
    }
  });

  it("OPERATOR adds every return mutation but not audit access", () => {
    for (const p of ["returns:read", "returns:export", "returns:create", "returns:edit", "returns:transition", "returns:import"] as Permission[]) {
      expect(can("OPERATOR", p)).toBe(true);
    }
    expect(can("OPERATOR", "audit:read")).toBe(false);
  });

  it("ADMIN has every permission", () => {
    for (const p of PERMISSIONS) {
      expect(can("ADMIN", p)).toBe(true);
    }
  });

  it("is default-deny for unknown / malformed roles", () => {
    expect(can(undefined, "returns:read")).toBe(false);
    expect(can(null, "returns:read")).toBe(false);
    expect(can("", "returns:read")).toBe(false);
    expect(can("SUPERADMIN", "returns:read")).toBe(false);
    expect(can("viewer", "returns:read")).toBe(false); // case-sensitive
    expect(can({ role: "ADMIN" }, "returns:read")).toBe(false);
  });

  it("permissionsFor reflects the hierarchy sizes", () => {
    expect(permissionsFor("VIEWER")).toHaveLength(2);
    expect(permissionsFor("OPERATOR")).toHaveLength(6);
    expect(permissionsFor("ADMIN")).toHaveLength(7);
  });

  it("every OPERATOR permission is also an ADMIN permission", () => {
    const admin = new Set(permissionsFor("ADMIN"));
    for (const p of permissionsFor("OPERATOR")) expect(admin.has(p)).toBe(true);
  });
});

describe("demo account restriction", () => {
  it("a demo VIEWER may only read — no export, no mutations, no audit", () => {
    expect(can("VIEWER", "returns:read", { isDemo: true })).toBe(true);
    for (const p of [
      "returns:export",
      "returns:create",
      "returns:edit",
      "returns:transition",
      "returns:import",
      "audit:read",
    ] as Permission[]) {
      expect(can("VIEWER", p, { isDemo: true })).toBe(false);
    }
  });

  it("the demo flag can never escalate a role beyond its own grant", () => {
    // Even if a demo session somehow carried an ADMIN role, the intersection
    // with DEMO_PERMISSIONS keeps it read-only.
    expect(can("ADMIN", "returns:create", { isDemo: true })).toBe(false);
    expect(can("ADMIN", "audit:read", { isDemo: true })).toBe(false);
    expect(can("ADMIN", "returns:read", { isDemo: true })).toBe(true);
  });

  it("DEMO_PERMISSIONS is a strict subset of the VIEWER grant", () => {
    const viewer = new Set(permissionsFor("VIEWER"));
    for (const p of DEMO_PERMISSIONS) expect(viewer.has(p)).toBe(true);
    expect(DEMO_PERMISSIONS.length).toBeLessThan(viewer.size);
  });

  it("permissionsFor reflects the demo narrowing", () => {
    expect(permissionsFor("VIEWER", { isDemo: true })).toEqual(["returns:read"]);
  });

  it("non-demo callers are unaffected", () => {
    expect(can("VIEWER", "returns:export")).toBe(true);
    expect(can("VIEWER", "returns:export", { isDemo: false })).toBe(true);
  });
});
