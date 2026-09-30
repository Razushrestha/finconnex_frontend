import { test, expect } from "@playwright/test";
import { AUTH_GUARDED_ROUTES } from "./helpers/routes";

test.describe.configure({ mode: "serial" });

test.describe("Auth guards (anonymous)", () => {
  for (const route of AUTH_GUARDED_ROUTES) {
    test(`redirects ${route} → /login (200)`, async ({ page }) => {
      const res = await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
      // After redirect, document response should be the login page.
      const status = res?.status() ?? 0;
      // Playwright's goto resolves to the final response after redirects.
      expect(
        status,
        `${route} → login should finish with HTTP 200 (got ${status})`,
      ).toBe(200);
      await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#password")).toBeVisible();
    });
  }
});

test.describe("Login page", () => {
  test("renders sign-in form with 200", async ({ page }) => {
    const res = await page.goto("/login", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    expect(res?.status() ?? 0).toBe(200);
    await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(
      page.getByRole("link", { name: /forgot password/i }),
    ).toBeVisible();
  });

  test("keeps user on login when fields empty", async ({ page }) => {
    const res = await page.goto("/login", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    expect(res?.status() ?? 0).toBe(200);
    await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });
});
