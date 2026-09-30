import { describe, expect, it } from "vitest";

import { LEAD_SOURCES } from "@/lib/leads/types";
import {
  INBOX_CHANNEL_FILTER_OPTIONS,
  conversationMatchesChannelFilter,
} from "@/lib/marketing/inbox/types";

describe("inbox channel filter", () => {
  it("lists every lead source", () => {
    expect([...INBOX_CHANNEL_FILTER_OPTIONS]).toEqual([...LEAD_SOURCES]);
  });

  it("maps Facebook and Instagram filters onto messenger channels", () => {
    expect(
      conversationMatchesChannelFilter("Facebook Messenger", "Facebook"),
    ).toBe(true);
    expect(
      conversationMatchesChannelFilter("Instagram DM", "Instagram"),
    ).toBe(true);
    expect(conversationMatchesChannelFilter("SMS", "Phone")).toBe(true);
    expect(conversationMatchesChannelFilter("WhatsApp", "Website")).toBe(false);
  });
});
