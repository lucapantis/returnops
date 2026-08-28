import { describe, expect, it } from "vitest";
import { auditCreateArgs, redactMetadata } from "./audit";

describe("redactMetadata", () => {
  it("drops keys that look like secrets", () => {
    const out = redactMetadata({
      password: "hunter2",
      passwordHash: "$2b$....",
      apiToken: "abc",
      secretKey: "x",
      authorization: "Bearer y",
      cookie: "sid=1",
      csvText: "a,b,c\n1,2,3",
      status: "RECEIVED",
    }) as Record<string, unknown>;

    expect(out.password).toBe("[redacted]");
    expect(out.passwordHash).toBe("[redacted]");
    expect(out.apiToken).toBe("[redacted]");
    expect(out.secretKey).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect(out.cookie).toBe("[redacted]");
    expect(out.csvText).toBe("[redacted]");
    expect(out.status).toBe("RECEIVED");
  });

  it("recurses into nested objects and arrays", () => {
    const out = redactMetadata({
      after: { status: "APPROVED", token: "nope" },
      refs: ["RET-1", "RET-2"],
    }) as { after: Record<string, unknown>; refs: unknown[] };
    expect(out.after.status).toBe("APPROVED");
    expect(out.after.token).toBe("[redacted]");
    expect(out.refs).toEqual(["RET-1", "RET-2"]);
  });

  it("truncates very long strings", () => {
    const long = "x".repeat(5000);
    const out = redactMetadata({ note: long }) as { note: string };
    expect(out.note.length).toBeLessThan(long.length);
    expect(out.note).toContain("truncated");
  });

  it("caps large arrays", () => {
    const big = Array.from({ length: 200 }, (_, i) => `RET-${i}`);
    const out = redactMetadata(big) as unknown[];
    expect(out.length).toBe(51); // 50 items + 1 summary marker
    expect(String(out[50])).toContain("more");
  });
});

describe("auditCreateArgs", () => {
  const actor = { id: "u1", email: "op@example.com", role: "OPERATOR" as const };

  it("maps the actor and entity onto the row", () => {
    const args = auditCreateArgs({
      actor,
      action: "return.create",
      entityType: "Return",
      entityId: "r1",
      metadata: { returnRef: "RET-2026-0001" },
    });
    expect(args.data).toMatchObject({
      actorId: "u1",
      actorEmail: "op@example.com",
      actorRole: "OPERATOR",
      action: "return.create",
      entityType: "Return",
      entityId: "r1",
    });
    expect(args.data.metadata).toEqual({ returnRef: "RET-2026-0001" });
  });

  it("omits metadata entirely when none is supplied", () => {
    const args = auditCreateArgs({
      actor,
      action: "return.update",
      entityType: "Return",
      entityId: "r1",
    });
    expect("metadata" in args.data).toBe(false);
  });

  it("redacts secret-looking metadata before storing", () => {
    const args = auditCreateArgs({
      actor,
      action: "return.csv_import",
      entityType: "Return",
      entityId: "batch1",
      metadata: { csvText: "secret,data", imported: 3 },
    });
    expect(args.data.metadata).toEqual({ csvText: "[redacted]", imported: 3 });
  });
});
