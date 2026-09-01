import { describe, expect, it } from "vitest";
import {
  smokeDocumentRequestsMock,
  smokeDocumentRequestsWiring,
} from "@/lib/documents/requests/smoke";

describe("Document Requests API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeDocumentRequestsWiring();
  });

  it("mocks all 11 workspace-scoped Swagger operations", async () => {
    await smokeDocumentRequestsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
