import { prisma } from "./prisma";
import type { ExistingRecordKeys } from "./import";

const MAX_IMPORT_ROWS = 5000;

export { MAX_IMPORT_ROWS };

/** Loads the keys needed for duplicate detection against the current database. */
export async function loadExistingKeys(): Promise<ExistingRecordKeys> {
  const records = await prisma.return.findMany({
    select: { returnRef: true, orderNumber: true, sku: true },
  });

  const returnRefs = new Set(records.map((r) => r.returnRef.toLowerCase()));
  const orderSkuPairs = new Set(
    records.map((r) => `${r.orderNumber.toLowerCase()}::${r.sku.toLowerCase()}`)
  );

  return { returnRefs, orderSkuPairs };
}
