import { describe, expect, it } from "vitest";
import { isMissingChatRoute } from "@/lib/chat/api";
import { smokeChatMock, smokeChatWiring } from "@/lib/chat/smoke";

describe("Team Chat API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeChatWiring();
  });

  it("mocks conversations/messages/reactions/read", async () => {
    await smokeChatMock();
  });

  it("treats Nest Cannot GET as a missing unread route", () => {
    expect(
      isMissingChatRoute(
        new Error("Cannot GET /v1/workspaces/x/chat/unread-count"),
      ),
    ).toBe(true);
    expect(isMissingChatRoute(new Error("CRM request failed (404)"))).toBe(true);
    expect(isMissingChatRoute(new Error("Sign in to continue"))).toBe(false);
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
