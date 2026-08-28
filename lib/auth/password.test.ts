import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces a bcrypt hash that is not the plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("salts: the same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toEqual(b);
  });

  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cret-value");
    expect(await verifyPassword("s3cret-value", hash)).toBe(true);
    expect(await verifyPassword("s3cret-valuE", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("the dummy hash is a valid bcrypt hash that never matches", async () => {
    expect(DUMMY_HASH).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(await verifyPassword("anything", DUMMY_HASH)).toBe(false);
  });
});
