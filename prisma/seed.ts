// Seeds the Neon PostgreSQL database with realistic *fictional* return records
// spanning every status, reason and a spread of received dates. Run with
// `npm run db:seed` (wraps `prisma db seed`).
//
// Safe & repeatable: it refuses to run against anything that doesn't look like
// a local or Neon demo database (see lib/dbGuard.ts), and it replaces the
// dataset inside a single transaction, so re-running always lands on the same
// deterministic 72-row demo set with no partial state.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { RETURN_REASONS, RETURN_STATUSES, type ReturnReason, type ReturnStatus } from "../lib/constants";
import { assertSeedableDatabaseUrl } from "../lib/dbGuard";
import { hashPassword } from "../lib/auth/password";
import type { Role } from "../lib/auth/permissions";

const connectionString = assertSeedableDatabaseUrl(process.env.DATABASE_URL);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Deterministic PRNG (mulberry32) so re-running the seed produces the same
// demo dataset every time — handy for screenshots and repeatable testing.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260827);

function pick<T>(arr: readonly T[]): T {
  const value = arr[Math.floor(rand() * arr.length)];
  if (value === undefined) throw new Error("pick() called on empty array");
  return value;
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  "Amara", "Liam", "Sofia", "Noah", "Priya", "Elena", "Marcus", "Yuki",
  "Fatima", "Oliver", "Isabella", "Kenji", "Grace", "Diego", "Nadia",
  "Ethan", "Chloe", "Mateo", "Zara", "Lucas", "Ingrid", "Tariq", "Freya",
  "Hassan", "Maya", "Felix", "Aisha", "Leo", "Ines", "Omar",
];
const LAST_NAMES = [
  "Okafor", "Nguyen", "Muller", "Kowalski", "Fernandez", "Larsen",
  "Haddad", "Rossi", "Tanaka", "Silva", "Andersen", "Petrov", "Costa",
  "Meyer", "Dubois", "Novak", "Sato", "Reyes", "Bakker", "Kim",
];

const PRODUCTS: { name: string; sku: string }[] = [
  { name: "Trailhead Waterproof Backpack 28L", sku: "TB-2801-BLK" },
  { name: "Aero Runner Mesh Sneakers", sku: "AR-1004-WHT" },
  { name: "CozyKnit Wool Blend Sweater", sku: "CK-3302-NVY" },
  { name: "PulseFit Wireless Earbuds", sku: "PF-7710-BLK" },
  { name: "SteadyBrew 12-Cup Coffee Maker", sku: "SB-4501-SLV" },
  { name: "UrbanGlide Electric Kick Scooter", sku: "UG-9012-GRY" },
  { name: "LumaHome Smart LED Desk Lamp", sku: "LH-2209-WHT" },
  { name: "TerraPack Insulated Water Bottle 1L", sku: "TP-1105-GRN" },
  { name: "FlexFit Adjustable Yoga Mat", sku: "FF-6603-PUR" },
  { name: "NightOwl Blackout Curtain Set", sku: "NO-8801-CHR" },
  { name: "GreenLeaf Ceramic Planter (Set of 3)", sku: "GL-3007-TER" },
  { name: "SwiftCharge 65W USB-C Charger", sku: "SC-5502-BLK" },
  { name: "AlpineTrek Softshell Jacket", sku: "AT-4408-OLV" },
  { name: "PixelView 27in Monitor Stand", sku: "PV-1122-BLK" },
  { name: "HomeBrew Manual Pour-Over Kit", sku: "HB-3390-CPR" },
  { name: "QuietStep Memory Foam Slippers", sku: "QS-2245-GRY" },
  { name: "BrightPath LED Camping Lantern", sku: "BP-6671-YEL" },
  { name: "MetroCarry Laptop Sleeve 15in", sku: "MC-9903-BLK" },
  { name: "FreshBrew Glass French Press", sku: "FB-1187-CLR" },
  { name: "TrailMate Trekking Poles (Pair)", sku: "TM-4456-SLV" },
];

const OPERATOR_NOTES_BY_STATUS: Record<ReturnStatus, string[]> = {
  RECEIVED: [
    "Package logged at intake. Awaiting inspection queue.",
    "Item scanned in; original packaging intact.",
    "",
  ],
  INSPECTING: [
    "Inspection in progress — checking for damage against photos.",
    "Verifying serial number against original order.",
    "Awaiting second inspector sign-off.",
  ],
  APPROVED: [
    "Passed inspection, no damage found. Approved for refund.",
    "Confirmed defect matches customer report. Approved.",
    "Approved — item resellable as open-box.",
  ],
  REJECTED: [
    "Item shows signs of use beyond return window policy.",
    "Missing original accessories; return rejected per policy.",
    "Customer notified of rejection with photo evidence.",
  ],
  COMPLETED: [
    "Refund issued to original payment method.",
    "Replacement shipped; case closed.",
    "Store credit applied and customer notified.",
  ],
};

// Weighted so the pipeline looks realistic: most historical returns are
// COMPLETED, with a smaller live queue still in earlier stages.
const STATUS_WEIGHTS: [ReturnStatus, number][] = [
  ["RECEIVED", 8],
  ["INSPECTING", 6],
  ["APPROVED", 5],
  ["REJECTED", 4],
  ["COMPLETED", 22],
];

function pickWeightedStatus(): ReturnStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (roll < weight) return status;
    roll -= weight;
  }
  return "RECEIVED";
}

const DAY_MS = 1000 * 60 * 60 * 24;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

// Upserts the two required accounts from environment variables. Credentials
// live only in the git-ignored `.env` (run `node scripts/init-local-auth-env.mjs`
// to generate them). Re-running is safe: existing rows are updated in place,
// never duplicated, and no other users are touched.
async function seedUsers() {
  const specs: {
    email?: string;
    password?: string;
    name?: string;
    role: Role;
    envPrefix: string;
  }[] = [
    {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: process.env.SEED_ADMIN_NAME ?? "ReturnOps Admin",
      role: "ADMIN",
      envPrefix: "SEED_ADMIN",
    },
    {
      email: process.env.SEED_VIEWER_EMAIL,
      password: process.env.SEED_VIEWER_PASSWORD,
      name: process.env.SEED_VIEWER_NAME ?? "ReturnOps Viewer (demo)",
      role: "VIEWER",
      envPrefix: "SEED_VIEWER",
    },
  ];

  // An OPERATOR account is only provisioned if its credentials are present —
  // it isn't required for the deployment, but the test suite and day-to-day
  // operations use one.
  if (process.env.SEED_OPERATOR_EMAIL || process.env.SEED_OPERATOR_PASSWORD) {
    specs.push({
      email: process.env.SEED_OPERATOR_EMAIL,
      password: process.env.SEED_OPERATOR_PASSWORD,
      name: process.env.SEED_OPERATOR_NAME ?? "ReturnOps Operator",
      role: "OPERATOR",
      envPrefix: "SEED_OPERATOR",
    });
  }

  for (const spec of specs) {
    if (!spec.email || !spec.password) {
      throw new Error(
        `${spec.envPrefix}_EMAIL and ${spec.envPrefix}_PASSWORD must be set in .env ` +
          `before seeding. Run: node scripts/init-local-auth-env.mjs`
      );
    }
    if (spec.password.length < 12) {
      throw new Error(`${spec.envPrefix}_PASSWORD must be at least 12 characters.`);
    }

    const email = spec.email.trim().toLowerCase();
    const passwordHash = await hashPassword(spec.password);

    await prisma.user.upsert({
      where: { email },
      create: { email, name: spec.name!, role: spec.role, passwordHash, isActive: true },
      update: { name: spec.name!, role: spec.role, passwordHash, isActive: true },
    });

    console.log(`  ${spec.role.padEnd(8)} ${email}`);
  }
}

async function main() {
  console.log("Seeding ReturnOps demo data...");

  const totalRecords = 72;
  const rows: {
    returnRef: string;
    orderNumber: string;
    productName: string;
    sku: string;
    customerName: string;
    reason: ReturnReason;
    status: ReturnStatus;
    receivedDate: Date;
    completedDate: Date | null;
    operatorNotes: string | null;
  }[] = [];

  for (let i = 0; i < totalRecords; i++) {
    const status = pickWeightedStatus();
    const reason: ReturnReason = pick(RETURN_REASONS);
    const product = pick(PRODUCTS);
    const customer = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const receivedDaysAgo = randomInt(1, 120);
    const receivedDate = daysAgo(receivedDaysAgo);

    let completedDate: Date | null = null;
    if (status === "COMPLETED") {
      const processingDays = randomInt(1, Math.min(14, receivedDaysAgo));
      completedDate = new Date(receivedDate.getTime() + processingDays * DAY_MS);
    }

    const year = receivedDate.getFullYear();
    const returnRef = `RET-${year}-${String(i + 1).padStart(4, "0")}`;
    const orderNumber = `ORD-${100000 + randomInt(0, 899999)}`;

    rows.push({
      returnRef,
      orderNumber,
      productName: product.name,
      sku: product.sku,
      customerName: customer,
      reason,
      status,
      receivedDate,
      completedDate,
      operatorNotes: pick(OPERATOR_NOTES_BY_STATUS[status]) || null,
    });
  }

  await prisma.$transaction([
    prisma.return.deleteMany(),
    prisma.return.createMany({ data: rows }),
  ]);

  console.log(`Seeded ${rows.length} returns.`);
  const statusCounts = RETURN_STATUSES.map(
    (s) => `${s}: ${rows.filter((r) => r.status === s).length}`
  );
  console.log(statusCounts.join(", "));

  console.log("Seeding accounts...");
  await seedUsers();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
