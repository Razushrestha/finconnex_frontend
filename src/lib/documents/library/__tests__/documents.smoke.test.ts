import { describe, expect, it } from "vitest";
import {
  smokeDocumentsMock,
  smokeDocumentsWiring,
} from "@/lib/documents/library/smoke";

describe("Documents API smoke (CI)", () => {
  it("wires client, catalog, and library UI", () => {
    smokeDocumentsWiring();
  });

  it("mocks all 7 workspace-scoped Swagger operations", async () => {
    await smokeDocumentsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
