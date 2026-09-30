import { test, expect } from "@playwright/test";
import { PUBLIC_ROUTES } from "./helpers/routes";

/**
 * Hit each public route once before assertions. Parallel Turbopack compiles
 * under load can briefly answer 404 for a valid page.
 */
async function warmup(request: import("@playwright/test").APIRequestContext) {
  for (const route of PUBLIC_ROUTES) {
    await request.get(route, { failOnStatusCode: false, timeout: 90_000 });
  }
}

async function gotoExpect200(
  page: import("@playwright/test").Page,
  route: string,
) {
  let res = await page.goto(route, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  let status = res?.status() ?? 0;
  // One retry for cold Turbopack compile races.
  if (status === 404 || status >= 500) {
    await page.waitForTimeout(500);
    res = await page.goto(route, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    status = res?.status() ?? 0;
  }
  expect(status, `${route} should be HTTP 200 (got ${status})`).toBe(200);
  await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
  if (!route.includes("/login") && !route.startsWith("/p/")) {
    expect(page.url()).not.toMatch(/\/login\?callbackUrl=/);
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Public routes", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;
    await warmup(request);
    await context.close();
  });

  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route} with 200`, async ({ page }) => {
      await gotoExpect200(page, route);
    });
  }
});
