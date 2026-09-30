import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { DOCUMENTS_ROUTES } from "./helpers/routes";

test.describe("Documents & e-sign", () => {
  for (const route of DOCUMENTS_ROUTES) {
    test(`list ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  test("document request create", async ({ page }) => {
    await expectPageLoads(page, "/documents/requests/create");
  });

  test("signature create", async ({ page }) => {
    await expectPageLoads(page, "/signature/create");
  });

  test("library upload", async ({ page }) => {
    await expectPageLoads(page, "/documents/library/upload");
  });
});
