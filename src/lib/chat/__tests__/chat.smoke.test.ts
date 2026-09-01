import { describe, expect, it } from "vitest";
import { smokeChatMock, smokeChatWiring } from "@/lib/chat/smoke";

describe("Team Chat API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeChatWiring();
  });

  it("mocks conversations/messages/reactions/read", async () => {
    await smokeChatMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
