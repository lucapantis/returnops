import type { Return } from "@/app/generated/prisma/client";

// Plain JSON-safe shape sent to the client (Dates as ISO strings).
export interface ReturnDto {
  id: string;
  returnRef: string;
  orderNumber: string;
  productName: string;
  sku: string;
  customerName: string;
  reason: string;
  status: string;
  receivedDate: string;
  completedDate: string | null;
  operatorNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeReturn(r: Return): ReturnDto {
  return {
    id: r.id,
    returnRef: r.returnRef,
    orderNumber: r.orderNumber,
    productName: r.productName,
    sku: r.sku,
    customerName: r.customerName,
    reason: r.reason,
    status: r.status,
    receivedDate: r.receivedDate.toISOString(),
    completedDate: r.completedDate ? r.completedDate.toISOString() : null,
    operatorNotes: r.operatorNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
