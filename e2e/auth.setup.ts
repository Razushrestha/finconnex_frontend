import { test as setup, expect } from "@playwright/test";
import {
  apiLogin,
  authStatePath,
  e2eCredentials,
  ensureAuthDir,
} from "./helpers/auth";

setup("authenticate", async ({ page, request }) => {
  ensureAuthDir();
  const creds = e2eCredentials();
  const viaApi = await apiLogin(request, creds);

  expect(
    viaApi.ok,
    `API login failed (${viaApi.status}). Set E2E_EMAIL and E2E_PASSWORD to a live CRM user.`,
  ).toBeTruthy();

  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });
  await expect(page.locator("body")).toBeVisible();
  await page.context().storageState({ path: authStatePath() });
});
