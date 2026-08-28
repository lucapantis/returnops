import { test as setup } from "@playwright/test";
import { STORAGE_STATE, login, type TestRole } from "./roles";

// Runs before the test projects: signs in as each role through the UI and
// persists the session cookie so individual specs can adopt a role instantly.
for (const role of ["admin", "operator", "viewer"] as TestRole[]) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await login(page, role);
    await page.context().storageState({ path: STORAGE_STATE[role] });
  });
}
