import { describe, expect, it } from "vitest";
import {
  smokeContactsMock,
  smokeContactsWiring,
} from "@/lib/contacts/smoke";

describe("Contacts API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeContactsWiring();
  });

  it("mocks list/get/create/update/bulk/import/merge/delete", async () => {
    await smokeContactsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
