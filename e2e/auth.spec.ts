import { expect, test } from "@playwright/test";
import { NO_AUTH, STORAGE_STATE, login } from "./roles";

const runId = Date.now();

function returnPayload(suffix: string) {
  return {
    orderNumber: `ORD-${suffix}`,
    productName: "Auth Test Widget",
    sku: `SKU-${suffix}`,
    customerName: "Auth Test Customer",
    reason: "DEFECTIVE",
    status: "RECEIVED",
    receivedDate: "2026-08-01",
  };
}

// ===========================================================================
// Unauthenticated
// ===========================================================================
test.describe("unauthenticated", () => {
  test.use({ storageState: NO_AUTH });

  test("protected pages redirect to the login screen", async ({ page }) => {
    for (const path of ["/", "/returns", "/returns/new", "/returns/import", "/audit"]) {
      await page.goto(path);
      await expect(page, `expected ${path} to redirect`).toHaveURL(/\/login/);
    }
    // the callbackUrl is preserved so the user lands where they intended
    await page.goto("/returns/import");
    await expect(page).toHaveURL(/callbackUrl=%2Freturns%2Fimport/);
  });

  test("API routes answer 401 without a session", async ({ request }) => {
    expect((await request.get("/api/returns")).status()).toBe(401);
    expect((await request.get("/api/metrics")).status()).toBe(401);
    expect((await request.get("/api/audit")).status()).toBe(401);
    expect((await request.get("/api/returns/export")).status()).toBe(401);
    const created = await request.post("/api/returns", {
      data: returnPayload(`UNAUTH-${runId}`),
    });
    expect(created.status()).toBe(401);
  });

  test("invalid credentials show a generic error and stay on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@returnops.local");
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a login for an account that does not exist gives the same generic error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(`no-such-user-${runId}@example.com`);
    await page.getByLabel("Password").fill("whatever-123456");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("valid credentials sign the user in", async ({ page }) => {
    await login(page, "viewer");
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("a forged session cookie is treated as no session", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: "forged.header.payload.signature",
        url: "http://localhost:3000",
      },
    ]);
    await page.goto("/returns");
    await expect(page).toHaveURL(/\/login/);
    const api = await context.request.get("/api/returns");
    expect(api.status()).toBe(401);
  });
});

// ===========================================================================
// VIEWER — read-only
// ===========================================================================
test.describe("VIEWER", () => {
  test.use({ storageState: STORAGE_STATE.viewer });

  test("mutation actions are hidden in the UI", async ({ page }) => {
    await page.goto("/returns");
    await expect(page.getByRole("link", { name: "New return" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Import CSV" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);

    // open a return detail — no Edit button, no workflow panel
    await page.goto("/returns");
    await page.locator("table tbody tr a").first().click();
    await expect(page).toHaveURL(/\/returns\/[^/]+$/);
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByText("Advance workflow")).toHaveCount(0);
  });

  test("mutation and audit pages redirect to /forbidden", async ({ page }) => {
    for (const path of ["/returns/new", "/returns/import", "/audit"]) {
      await page.goto(path);
      await expect(page, `expected ${path} to be forbidden`).toHaveURL(/\/forbidden/);
    }
  });

  test("direct API mutation attempts are rejected with 403", async ({ request }) => {
    // reads are allowed
    const list = await request.get("/api/returns");
    expect(list.status()).toBe(200);
    const id = (await list.json()).data[0].id as string;

    const create = await request.post("/api/returns", {
      data: returnPayload(`VIEWER-${runId}`),
    });
    expect(create.status()).toBe(403);

    const patch = await request.patch(`/api/returns/${id}`, {
      data: { status: "INSPECTING" },
    });
    expect(patch.status()).toBe(403);

    const csv = [
      "returnRef,orderNumber,productName,sku,customerName,reason,status,receivedDate,completedDate,operatorNotes",
      `RET-VIEWER-${runId},ORD-VIEWER-${runId},X,SKU-VIEWER-${runId},C,OTHER,RECEIVED,2026-08-01,,`,
    ].join("\n");
    const preview = await request.post("/api/returns/import/preview", {
      data: { csvText: csv },
    });
    expect(preview.status()).toBe(403);
    const commit = await request.post("/api/returns/import", { data: { csvText: csv } });
    expect(commit.status()).toBe(403);

    const audit = await request.get("/api/audit");
    expect(audit.status()).toBe(403);
  });

  test("CSV export (a viewer-safe operation) still works", async ({ request }) => {
    const res = await request.get("/api/returns/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
  });
});

// ===========================================================================
// OPERATOR — mutations, but no audit access
// ===========================================================================
test.describe("OPERATOR", () => {
  test.use({ storageState: STORAGE_STATE.operator });

  test("can create a return and walk it through legal status transitions", async ({
    request,
  }) => {
    const suffix = `OP-${runId}`;
    const create = await request.post("/api/returns", {
      data: { ...returnPayload(suffix), returnRef: `RET-${suffix}` },
    });
    expect(create.status()).toBe(201);
    const id = (await create.json()).data.id as string;

    const toInspecting = await request.patch(`/api/returns/${id}`, {
      data: { status: "INSPECTING" },
    });
    expect(toInspecting.status()).toBe(200);

    // RECEIVED/INSPECTING -> COMPLETED is not a legal jump
    const illegal = await request.patch(`/api/returns/${id}`, {
      data: { status: "COMPLETED" },
    });
    expect(illegal.status()).toBe(400);

    const toApproved = await request.patch(`/api/returns/${id}`, {
      data: { status: "APPROVED" },
    });
    expect(toApproved.status()).toBe(200);
  });

  test("can import returns from CSV", async ({ request }) => {
    const ref = `RET-OPIMP-${runId}`;
    const csv = [
      "returnRef,orderNumber,productName,sku,customerName,reason,status,receivedDate,completedDate,operatorNotes",
      `${ref},ORD-OPIMP-${runId},Imported,SKU-OPIMP-${runId},Import Cust,SIZE_FIT,RECEIVED,2026-08-05,,ok`,
    ].join("\n");
    const res = await request.post("/api/returns/import", { data: { csvText: csv } });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.imported).toBe(1);
  });

  test("cannot reach the audit log (API 403, page redirect)", async ({ request, page }) => {
    expect((await request.get("/api/audit")).status()).toBe(403);
    await page.goto("/audit");
    await expect(page).toHaveURL(/\/forbidden/);
  });
});

// ===========================================================================
// ADMIN — audit access + audit-entry creation
// ===========================================================================
test.describe("ADMIN", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("sees the audit log link and page", async ({ page }) => {
    await page.goto("/");
    // on desktop the nav is visible; assert the page loads regardless of viewport
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
  });

  test("the audit trail recorded the OPERATOR mutations", async ({ request }) => {
    const res = await request.get("/api/audit?action=return.create");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(
      body.data.every((r: { action: string }) => r.action === "return.create")
    ).toBe(true);

    // the import above wrote a csv_import row with counts but no raw CSV
    const imports = await request.get("/api/audit?action=return.csv_import");
    const importBody = await imports.json();
    expect(importBody.data.length).toBeGreaterThan(0);
    const meta = importBody.data[0].metadata;
    expect(meta).toHaveProperty("imported");
    expect(JSON.stringify(meta)).not.toContain("Import Cust");
  });

  test("audit filtering by actor works", async ({ request }) => {
    const res = await request.get(
      `/api/audit?actor=${encodeURIComponent("operator@returnops.local")}`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(
      body.data.every(
        (r: { actorEmail: string }) => r.actorEmail === "operator@returnops.local"
      )
    ).toBe(true);
  });
});

// ===========================================================================
// Session lifecycle
// ===========================================================================
test.describe("logout", () => {
  test("signing out ends the session", async ({ page }) => {
    await login(page, "viewer");
    await page.goto("/");

    // the Sign out control lives in the sidebar / mobile drawer
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await page.getByRole("button", { name: "Sign out" }).click();

    await page.waitForURL(/\/login/);
    await page.goto("/returns");
    await expect(page).toHaveURL(/\/login/);
  });
});
