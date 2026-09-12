import { describe, expect, it } from "vitest";
import {
  smokeCompaniesMock,
  smokeCompaniesSort,
  smokeCompaniesWiring,
} from "@/lib/companies/smoke";

describe("Companies API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeCompaniesWiring();
  });

  it("reorders companies for Name (A-Z) / Name (Z-A)", () => {
    smokeCompaniesSort();
  });

  it("mocks list/get/create/update/bulk/import/export/merge/delete", async () => {
    await smokeCompaniesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
