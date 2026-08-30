import { describe, expect, it } from "vitest";
import { smokeNotesMock, smokeNotesWiring } from "@/lib/notes/smoke";

describe("Notes API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeNotesWiring();
  });

  it("mocks workspace-scoped note routes", async () => {
    await smokeNotesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
