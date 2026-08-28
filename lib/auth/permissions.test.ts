import { describe, expect, it } from "vitest";
import { can, permissionsFor, PERMISSIONS, type Permission } from "./permissions";

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
