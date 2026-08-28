import { expect, test } from "@playwright/test";

// Exercises the core ReturnOps workflow end to end against the seeded dev
// database: dashboard -> browse/filter returns -> create a return -> advance
// its status -> bulk import via CSV. Uses a per-run unique suffix so the
// suite is safe to re-run without hitting duplicate-record conflicts.
const runId = Date.now();

test.describe("ReturnOps critical flow", () => {
  test("dashboard renders metrics from seeded data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("Total returns")).toBeVisible();
    await expect(page.getByText("Returns by status")).toBeVisible();
    await expect(page.getByText("Most common reasons")).toBeVisible();
  });

  test("returns list can be searched and filtered", async ({ page }) => {
    await page.goto("/returns");
    await expect(page.getByRole("heading", { name: "Returns", level: 1 })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();

    await page.getByLabel("Status").selectOption("COMPLETED");
    await expect(page).toHaveURL(/status=COMPLETED/);
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    await page.getByText("Clear all filters").click();
    await expect(page).toHaveURL(/\/returns$/);
  });

  test("a return can be created and advanced through the workflow", async ({ page }) => {
    const orderNumber = `ORD-E2E-${runId}`;

    await page.goto("/returns/new");
    await page.getByLabel("Order number").fill(orderNumber);
    await page.getByLabel("SKU").fill(`SKU-E2E-${runId}`);
    await page.getByLabel("Product name").fill("E2E Test Widget");
    await page.getByLabel("Customer name").fill("E2E Test Customer");
    await page.getByLabel("Reason").selectOption("DEFECTIVE");
    await page.getByLabel("Received date").fill("2026-08-01");
    await page.getByRole("button", { name: "Create return" }).click();

    // Redirected to the detail page for the new record.
    await expect(page).toHaveURL(/\/returns\/[^/]+$/);
    await expect(page.getByText(`Order ${orderNumber}`)).toBeVisible();
    await expect(page.getByText("Received", { exact: true })).toBeVisible();

    // Advance RECEIVED -> INSPECTING via the workflow action.
    await page.getByRole("button", { name: "Move to Inspecting" }).click();
    await expect(page.getByText("Inspecting", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Move to Approved" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Move to Rejected" })).toBeVisible();
  });

  test("navigation highlights only the most specific active section", async ({ page }) => {
    await page.goto("/returns/import");
    const current = page.locator('nav a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/Import CSV/);
  });

  test("returns can be bulk imported from a CSV file", async ({ page }) => {
    const returnRef = `RET-E2E-${runId}`;
    const csv = [
      "returnRef,orderNumber,productName,sku,customerName,reason,status,receivedDate,completedDate,operatorNotes",
      `${returnRef},ORD-E2E-IMPORT-${runId},Imported Widget,SKU-E2E-IMPORT-${runId},Import Test Customer,SIZE_FIT,RECEIVED,2026-08-05,,Imported via e2e test`,
    ].join("\n");

    await page.goto("/returns/import");
    await page.setInputFiles('input[type="file"]', {
      name: "e2e-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf-8"),
    });

    await expect(page.getByText("Ready to import")).toBeVisible();
    const importButton = page.getByRole("button", { name: /^Import 1 row$/ });
    await expect(importButton).toBeEnabled();
    await importButton.click();

    await expect(page.getByRole("heading", { name: "Import complete" })).toBeVisible();
    await expect(page.getByText(/Imported 1 of 1 rows/)).toBeVisible();

    // Verify the imported record is now searchable in the returns list.
    await page.goto(`/returns?search=${returnRef}`);
    await expect(page.getByRole("link", { name: returnRef })).toBeVisible();
  });
});
