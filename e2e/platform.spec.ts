import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { PLATFORM_ROUTES } from "./helpers/routes";

test.describe("Platform modules", () => {
  for (const route of PLATFORM_ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  const creates = [
    "/booking/create",
    "/support/create",
    "/portals/create",
    "/reports/create",
    "/resources/create",
    "/journeys/create",
    "/time-tracking/create",
  ] as const;

  for (const route of creates) {
    test(`create ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }
});
