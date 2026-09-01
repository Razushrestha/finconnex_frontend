import { describe, expect, it } from "vitest";
import {
  smokeCreditNotesMock,
  smokeCreditNotesWiring,
} from "@/lib/finance/credit-notes/smoke";

describe("Credit Notes API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeCreditNotesWiring();
  });

  it("mocks all 11 Swagger routes", async () => {
    await smokeCreditNotesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
