import { describe, expect, it } from "vitest";
import { createReturnSchema, csvRowSchema, updateReturnSchema } from "./validation";

const baseInput = {
  orderNumber: "ORD-100001",
  productName: "Aero Runner Mesh Sneakers",
  sku: "AR-1004-WHT",
  customerName: "Amara Okafor",
  reason: "DAMAGED",
  status: "RECEIVED",
  receivedDate: "2026-01-05",
};

describe("createReturnSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = createReturnSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const { customerName, ...rest } = baseInput;
    void customerName;
    const result = createReturnSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid reason enum value", () => {
    const result = createReturnSchema.safeParse({ ...baseInput, reason: "LOST" });
    expect(result.success).toBe(false);
  });

  it("requires a completedDate when status is COMPLETED", () => {
    const result = createReturnSchema.safeParse({ ...baseInput, status: "COMPLETED" });
    expect(result.success).toBe(false);
  });

  it("accepts COMPLETED status with a completedDate", () => {
    const result = createReturnSchema.safeParse({
      ...baseInput,
      status: "COMPLETED",
      completedDate: "2026-01-10",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from string fields", () => {
    const result = createReturnSchema.safeParse({
      ...baseInput,
      customerName: "  Amara Okafor  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBe("Amara Okafor");
    }
  });
});

describe("updateReturnSchema", () => {
  it("rejects an empty update payload", () => {
    const result = updateReturnSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a partial update", () => {
    const result = updateReturnSchema.safeParse({ status: "INSPECTING" });
    expect(result.success).toBe(true);
  });
});

describe("csvRowSchema", () => {
  it("requires returnRef and status unlike createReturnSchema", () => {
    const result = csvRowSchema.safeParse(baseInput);
    expect(result.success).toBe(false);
  });

  it("accepts a fully-specified row", () => {
    const result = csvRowSchema.safeParse({ ...baseInput, returnRef: "RET-2026-0001" });
    expect(result.success).toBe(true);
  });
});
