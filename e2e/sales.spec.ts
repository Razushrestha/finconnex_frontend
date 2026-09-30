import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { SALES_ROUTES } from "./helpers/routes";

test.describe("Sales module", () => {
  for (const route of SALES_ROUTES) {
    test(`list ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  test("leads create form", async ({ page }) => {
    await expectPageLoads(page, "/sales/leads/create");
  });

  test("contacts create form", async ({ page }) => {
    await expectPageLoads(page, "/sales/contacts/create");
  });

  test("companies create form", async ({ page }) => {
    await expectPageLoads(page, "/sales/companies/create");
  });

  test("deals create form", async ({ page }) => {
    await expectPageLoads(page, "/sales/deals/create");
  });
});
