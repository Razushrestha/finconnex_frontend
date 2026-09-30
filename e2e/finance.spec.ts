import { test, expect } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { FINANCE_ROUTES } from "./helpers/routes";

test.describe("Finance module", () => {
  for (const route of FINANCE_ROUTES) {
    test(`list ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  const creates = [
    "/finance/estimates/create",
    "/finance/quotations/create",
    "/finance/invoices/create",
    "/finance/credit-notes/create",
    "/finance/payments/create",
    "/finance/products/create",
  ] as const;

  for (const route of creates) {
    test(`create ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  test("credit notes is live UI (not redirected to invoices)", async ({
    page,
  }) => {
    await page.goto("/finance/credit-notes", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/finance\/credit-notes/);
    await expect(page.getByText(/credit notes?/i).first()).toBeVisible();
  });
});
