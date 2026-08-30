import { describe, expect, it } from "vitest";
import { smokeTicketsMock, smokeTicketsWiring } from "@/lib/support/smoke";

describe("Tickets API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeTicketsWiring();
  });

  it("mocks ticket list/detail/replies/notes/merge", async () => {
    await smokeTicketsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
