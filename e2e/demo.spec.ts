import { expect, test } from "@playwright/test";
import { NO_AUTH } from "./roles";

// The public portfolio demo account. These tests drive the "Try demo" button
// on the login page, so they need the demo account provisioned:
//   npm run auth:init && npm run demo:provision
// They skip (rather than fail) when the demo isn't configured for this env.
const demoConfigured = Boolean(
  process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD
);

const runId = Date.now();

function returnPayload(suffix: string) {
  return {
    orderNumber: `ORD-${suffix}`,
    productName: "Demo Test Widget",
    sku: `SKU-${suffix}`,
    customerName: "Demo Test Customer",
    reason: "DEFECTIVE",
    status: "RECEIVED",
    receivedDate: "2026-08-01",
  };
}

test.describe("public portfolio demo account", () => {
  test.skip(!demoConfigured, "DEMO_USER_EMAIL / DEMO_USER_PASSWORD not set");
  test.use({ storageState: NO_AUTH });

  test("the 'Try demo' button signs in as a VIEWER", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try demo" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 })
    ).toBeVisible();
    // The role badge in the sidebar reads "Viewer".
    await expect(page.getByText("Viewer", { exact: true }).first()).toBeVisible();
  });

  test("mutation and export affordances are hidden in the UI", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try demo" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    await page.goto("/returns");
    await expect(page.getByRole("link", { name: "New return" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Import CSV" })).toHaveCount(0);
    // Unlike a normal VIEWER, the demo account cannot export.
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  });

  test("mutation and audit pages redirect to /forbidden", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try demo" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    for (const path of ["/returns/new", "/returns/import", "/audit"]) {
      await page.goto(path);
      await expect(page, `expected ${path} to be forbidden`).toHaveURL(/\/forbidden/);
    }
  });

  test("direct API calls: reads OK, everything else 403", async ({ page, request }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try demo" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    const list = await request.get("/api/returns");
    expect(list.status()).toBe(200);
    const id = (await list.json()).data[0].id as string;

    expect((await request.get("/api/metrics")).status()).toBe(200);

    // Export is denied for the demo account (a normal VIEWER may export).
    expect((await request.get("/api/returns/export")).status()).toBe(403);

    const create = await request.post("/api/returns", {
      data: returnPayload(`DEMO-${runId}`),
    });
    expect(create.status()).toBe(403);

    const patch = await request.patch(`/api/returns/${id}`, {
      data: { status: "INSPECTING" },
    });
    expect(patch.status()).toBe(403);

    const csv = [
      "returnRef,orderNumber,productName,sku,customerName,reason,status,receivedDate,completedDate,operatorNotes",
      `RET-DEMO-${runId},ORD-DEMO-${runId},X,SKU-DEMO-${runId},C,OTHER,RECEIVED,2026-08-01,,`,
    ].join("\n");
    expect(
      (await request.post("/api/returns/import/preview", { data: { csvText: csv } })).status()
    ).toBe(403);
    expect(
      (await request.post("/api/returns/import", { data: { csvText: csv } })).status()
    ).toBe(403);

    expect((await request.get("/api/audit")).status()).toBe(403);
  });
});
