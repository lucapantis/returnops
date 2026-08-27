import { z } from "zod";
import { RETURN_REASONS, RETURN_STATUSES } from "./constants";

// Single source of truth for what a valid return record looks like.
// Reused by the create/edit API routes, the CSV import pipeline, and forms.

const trimmedRequired = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

export const returnStatusSchema = z.enum(RETURN_STATUSES);
export const returnReasonSchema = z.enum(RETURN_REASONS);

// Accepts a Date, an ISO string, or a plain "YYYY-MM-DD" string (from <input
// type="date">) and coerces to a Date.
const dateInput = z.coerce.date({
  error: (issue) =>
    issue.input === undefined ? "Date is required" : "Invalid date",
});

export const createReturnSchema = z
  .object({
    // Omit to have the server assign the next sequential reference
    // (RET-<year>-<seq>). CSV import always supplies its own reference.
    returnRef: trimmedRequired("Return reference", 40).optional(),
    orderNumber: trimmedRequired("Order number", 40),
    productName: trimmedRequired("Product name", 200),
    sku: trimmedRequired("SKU", 60),
    customerName: trimmedRequired("Customer name", 120),
    reason: returnReasonSchema,
    status: returnStatusSchema.default("RECEIVED"),
    receivedDate: dateInput,
    completedDate: z.coerce.date().nullish(),
    operatorNotes: z
      .string()
      .trim()
      .max(2000, "Notes must be 2000 characters or fewer")
      .nullish(),
  })
  .refine(
    (data) => data.status !== "COMPLETED" || data.completedDate != null,
    {
      message: "Completed date is required when status is COMPLETED",
      path: ["completedDate"],
    }
  );

export type CreateReturnInput = z.infer<typeof createReturnSchema>;

export const updateReturnSchema = z
  .object({
    orderNumber: trimmedRequired("Order number", 40).optional(),
    productName: trimmedRequired("Product name", 200).optional(),
    sku: trimmedRequired("SKU", 60).optional(),
    customerName: trimmedRequired("Customer name", 120).optional(),
    reason: returnReasonSchema.optional(),
    status: returnStatusSchema.optional(),
    receivedDate: dateInput.optional(),
    completedDate: z.coerce.date().nullish(),
    operatorNotes: z
      .string()
      .trim()
      .max(2000, "Notes must be 2000 characters or fewer")
      .nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;

// Query params for GET /api/returns
export const listReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: returnStatusSchema.optional(),
  reason: returnReasonSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z
    .enum(["receivedDate", "createdAt", "status", "customerName"])
    .default("receivedDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListReturnsQuery = z.infer<typeof listReturnsQuerySchema>;

// A single row of raw CSV input, before validation. All values are strings
// since that's what a CSV parser produces.
export const csvRowSchema = z.object({
  returnRef: trimmedRequired("Return reference", 40),
  orderNumber: trimmedRequired("Order number", 40),
  productName: trimmedRequired("Product name", 200),
  sku: trimmedRequired("SKU", 60),
  customerName: trimmedRequired("Customer name", 120),
  reason: returnReasonSchema,
  status: returnStatusSchema,
  receivedDate: dateInput,
  completedDate: z.coerce.date().nullish(),
  operatorNotes: z.string().trim().max(2000).nullish(),
}).refine((data) => data.status !== "COMPLETED" || data.completedDate != null, {
  message: "Completed date is required when status is COMPLETED",
  path: ["completedDate"],
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

export const REQUIRED_CSV_COLUMNS = [
  "returnRef",
  "orderNumber",
  "productName",
  "sku",
  "customerName",
  "reason",
  "status",
  "receivedDate",
] as const;

export const OPTIONAL_CSV_COLUMNS = ["completedDate", "operatorNotes"] as const;

export const ALL_CSV_COLUMNS = [
  ...REQUIRED_CSV_COLUMNS,
  ...OPTIONAL_CSV_COLUMNS,
] as const;
