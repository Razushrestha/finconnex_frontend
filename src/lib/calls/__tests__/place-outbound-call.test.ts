import { beforeEach, describe, expect, it, vi } from "vitest";

const CALL_ID = "bc66a010-b0d0-473d-b5e7-7d8ff13072be";
const requests: { path: string; method: string }[] = [];

vi.mock("@/lib/activity-timeline/auth", async (load) => ({
  ...(await load<typeof import("@/lib/activity-timeline/auth")>()),
  isBoundCrmSession: () => false,
  ensureCrmSession: async () => ({ workspaceId: "11111111-1111-4111-8111-111111111111" }),
}));
vi.mock("@/lib/calls/store", () => ({ mergeCrmCalls: vi.fn() }));
vi.mock("@/lib/crm/request", () => ({
  crmFetch: vi.fn(),
  crmBffFetch: vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    requests.push({ path, method });
    if (path.endsWith("/dial")) throw new Error("CRM request failed (503)");
    if (path.endsWith("/cancel")) return { id: CALL_ID, status: "CANCELLED" };
    return { id: CALL_ID, status: "SCHEDULED", subject: "Outbound call" };
  }),
}));

import { placeOutboundCrmCall } from "@/lib/calls/api";

describe("placeOutboundCrmCall", () => {
  beforeEach(() => {
    requests.length = 0;
  });

  it("cancels the call it created when dialling fails, so it is not left overdue", async () => {
    const result = await placeOutboundCrmCall({ phone: "+9779746861925", name: "Binayak" });

    expect(result.ok).toBe(false);
    const posted = requests.filter((r) => r.method === "POST").map((r) => r.path.split("/").pop());
    expect(posted).toContain("dial");
    expect(posted).toContain("cancel");
    expect(posted).not.toContain("start");
  });
});
