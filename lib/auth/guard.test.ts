import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `guard()` pulls in `server-only`, Auth.js and the Prisma client. Stub them so
// the authorization logic — especially the `{ fresh: true }` database re-check
// used by mutations and the audit trail — can be exercised in isolation.
vi.mock("server-only", () => ({}));

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: () => findUnique() } } }));

import { guard } from "./guard";

function session(role: string | undefined, email = "u1@example.com") {
  return { user: { id: "u1", email, name: "U1", role } };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  authMock.mockReset();
  findUnique.mockReset();
  delete process.env.DEMO_USER_EMAIL;
  delete process.env.DEMO_USER_PASSWORD;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("guard()", () => {
  it("denies with 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const r = await guard("returns:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("allows a permitted read against the session claim (no DB hit)", async () => {
    authMock.mockResolvedValue(session("VIEWER"));
    const r = await guard("returns:read");
    expect(r.ok).toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("denies a read the session role is not granted", async () => {
    authMock.mockResolvedValue(session("VIEWER"));
    const r = await guard("audit:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("fresh: re-checks the DB and denies a stale ADMIN token demoted to VIEWER", async () => {
    authMock.mockResolvedValue(session("ADMIN")); // stale JWT claim
    findUnique.mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "U1",
      role: "VIEWER", // current role in the database
      isActive: true,
    });
    const r = await guard("audit:read", { fresh: true });
    expect(findUnique).toHaveBeenCalled();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("fresh: denies a disabled account even with a valid session cookie", async () => {
    authMock.mockResolvedValue(session("ADMIN"));
    findUnique.mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "U1",
      role: "ADMIN",
      isActive: false,
    });
    const r = await guard("returns:create", { fresh: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("fresh: allows when the database still grants the permission", async () => {
    authMock.mockResolvedValue(session("ADMIN"));
    findUnique.mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "U1",
      role: "ADMIN",
      isActive: true,
    });
    const r = await guard("audit:read", { fresh: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe("ADMIN");
  });
});

describe("guard() — public portfolio demo account", () => {
  const DEMO = "demo@returnops.local";

  beforeEach(() => {
    process.env.DEMO_USER_EMAIL = DEMO;
  });

  it("lets the demo account read returns", async () => {
    authMock.mockResolvedValue(session("VIEWER", DEMO));
    const r = await guard("returns:read");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.role).toBe("VIEWER");
      expect(r.user.isDemo).toBe(true);
    }
  });

  it("denies CSV export to the demo account (a normal VIEWER may export)", async () => {
    authMock.mockResolvedValue(session("VIEWER", DEMO));
    const r = await guard("returns:export");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it.each([
    "returns:create",
    "returns:edit",
    "returns:transition",
    "returns:import",
    "audit:read",
  ] as const)("denies %s to the demo account (fresh DB re-check)", async (permission) => {
    authMock.mockResolvedValue(session("VIEWER", DEMO));
    findUnique.mockResolvedValue({
      id: "u1",
      email: DEMO,
      name: "U1",
      role: "VIEWER",
      isActive: true,
    });
    const r = await guard(permission, { fresh: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("clamps a demo session to VIEWER even if the token claims ADMIN", async () => {
    authMock.mockResolvedValue(session("ADMIN", DEMO));
    const r = await guard("audit:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("fresh: clamps a demo account promoted to ADMIN in the database", async () => {
    authMock.mockResolvedValue(session("VIEWER", DEMO));
    findUnique.mockResolvedValue({
      id: "u1",
      email: DEMO,
      name: "U1",
      role: "ADMIN", // tampered row
      isActive: true,
    });
    const r = await guard("returns:create", { fresh: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("respects an isDemo flag on the token even without the env var", async () => {
    delete process.env.DEMO_USER_EMAIL;
    authMock.mockResolvedValue({
      user: { id: "u1", email: "someone@example.com", name: "U1", role: "VIEWER", isDemo: true },
    });
    const r = await guard("returns:export");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });
});
