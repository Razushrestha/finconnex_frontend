import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { SETTINGS_ROUTES } from "./helpers/routes";

test.describe("Settings", () => {
  for (const route of SETTINGS_ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }
});
