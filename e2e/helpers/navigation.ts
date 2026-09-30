import { expect, type Page } from "@playwright/test";

export async function expectPageLoads(page: Page, route: string) {
  let response = await page.goto(route, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  let status = response?.status() ?? 0;
  if (status === 404 || status >= 500) {
    await page.waitForTimeout(500);
    response = await page.goto(route, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    status = response?.status() ?? 0;
  }
  expect(status, `${route} should be HTTP 200 (got ${status})`).toBe(200);
  await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
  const url = page.url();
  expect(url, `${route} should not 404`).not.toMatch(/\/_not-found/);
  if (!route.startsWith("/login")) {
    expect(url, `${route} should stay authenticated`).not.toMatch(
      /\/login(\?|$)/,
    );
  }
}

export async function expectRedirectsToLogin(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
}
