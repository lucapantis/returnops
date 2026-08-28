import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type TestRole = "admin" | "operator" | "viewer";

interface Creds {
  email: string;
  password: string;
}

export function credsFor(role: TestRole): Creds {
  const prefix = `SEED_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(
      `${prefix}_EMAIL / ${prefix}_PASSWORD are not set. Run \`npm run auth:init\` ` +
        `and \`npm run db:seed\` before the e2e suite.`
    );
  }
  return { email, password };
}

export const STORAGE_STATE: Record<TestRole, string> = {
  admin: "e2e/.auth/admin.json",
  operator: "e2e/.auth/operator.json",
  viewer: "e2e/.auth/viewer.json",
};

/** The empty storage state — an unauthenticated browser context. */
export const NO_AUTH = { cookies: [], origins: [] };

/** Drive the real login form. Works on desktop and mobile viewports. */
export async function login(page: Page, role: TestRole): Promise<void> {
  const { email, password } = credsFor(role);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 })
  ).toBeVisible();
}
