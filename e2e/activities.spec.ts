import { test } from "@playwright/test";
import { expectPageLoads } from "./helpers/auth";
import { ACTIVITIES_ROUTES } from "./helpers/routes";

test.describe("Activities module", () => {
  for (const route of ACTIVITIES_ROUTES) {
    test(`list ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }

  const creates = [
    "/activities/tasks/create",
    "/activities/calls/create",
    "/activities/messages/create",
    "/activities/emails/create",
    "/activities/meetings/create",
    "/activities/notes/create",
    "/activities/reminders/create",
  ] as const;

  for (const route of creates) {
    test(`create ${route}`, async ({ page }) => {
      await expectPageLoads(page, route);
    });
  }
});
