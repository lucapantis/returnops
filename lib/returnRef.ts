import { prisma } from "./prisma";

/**
 * Generates the next sequential return reference for the given year, e.g.
 * "RET-2026-0007". Scans existing refs for that year rather than keeping a
 * separate counter table — simple and fine at MVP scale.
 */
export async function generateNextReturnRef(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const prefix = `RET-${year}-`;

  const latest = await prisma.return.findFirst({
    where: { returnRef: { startsWith: prefix } },
    orderBy: { returnRef: "desc" },
    select: { returnRef: true },
  });

  let nextSeq = 1;
  if (latest) {
    const match = /(\d+)$/.exec(latest.returnRef);
    const digits = match?.[1];
    if (digits) {
      nextSeq = parseInt(digits, 10) + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
