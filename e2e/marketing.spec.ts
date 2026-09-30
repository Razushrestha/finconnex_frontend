import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { MARKETING_ROUTES } from "./helpers/routes";

test.describe("Marketing module", () => {
  for (const route of MARKETING_ROUTES) {
    test(`list ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  const creates = [
    "/marketing/email/create",
    "/marketing/sms/create",
    "/marketing/whatsapp/create",
    "/marketing/forms/create",
    "/marketing/linktree/create",
  ] as const;

  for (const route of creates) {
    test(`create ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }
});
