import { beforeEach, describe, expect, it, vi } from "vitest";

const requests: { path: string; method: string; body?: string }[] = [];
let authorizeReply: unknown = {
  authUrl: "https://zoom.us/oauth/authorize?client_id=abc&state=s",
};

vi.mock("@/lib/activity-timeline/auth", async (load) => ({
  ...(await load<typeof import("@/lib/activity-timeline/auth")>()),
  isBoundCrmSession: () => false,
  ensureCrmSession: async () => ({
    workspaceId: "11111111-1111-4111-8111-111111111111",
  }),
}));
vi.mock("@/lib/crm/request", () => ({
  crmFetch: vi.fn(),
  unwrapCrmData: (json: unknown) => json,
  crmBffFetch: vi.fn(async (path: string, init?: RequestInit) => {
    requests.push({
      path,
      method: init?.method ?? "GET",
      body: init?.body as string | undefined,
    });
    if (path.endsWith("/authorize")) return authorizeReply;
    if (path.endsWith("/disconnect")) {
      return { available: true, connected: false, needsReconnect: false };
    }
    return {
      available: true,
      connected: true,
      status: "CONNECTED",
      zoomEmail: "host@example.com",
      connectedAt: "2026-10-12T00:00:00.000Z",
      needsReconnect: false,
    };
  }),
}));

import {
  authorizeZoom,
  disconnectZoom,
  getZoomConnection,
  normalizeZoomStatus,
  zoomReturnNotice,
} from "@/lib/integrations/api";

describe("Zoom integration client", () => {
  beforeEach(() => {
    requests.length = 0;
    authorizeReply = {
      authUrl: "https://zoom.us/oauth/authorize?client_id=abc&state=s",
    };
  });

  it("reads the signed-in user's connection from the CRM", async () => {
    await expect(getZoomConnection()).resolves.toEqual({
      available: true,
      connected: true,
      zoomEmail: "host@example.com",
      connectedAt: "2026-10-12T00:00:00.000Z",
      needsReconnect: false,
    });
    expect(requests[0]).toMatchObject({
      path: "/v1/integrations/zoom/connection",
      method: "GET",
    });
  });

  it("returns Zoom's consent address", async () => {
    await expect(authorizeZoom()).resolves.toBe(
      "https://zoom.us/oauth/authorize?client_id=abc&state=s",
    );
  });

  it("refuses to send the browser anywhere but Zoom", async () => {
    authorizeReply = { authUrl: "https://evil.example/zoom.us/oauth" };
    await expect(authorizeZoom()).rejects.toThrow(/Zoom sign-in address/);
  });

  it("disconnects with a POST", async () => {
    await expect(disconnectZoom()).resolves.toMatchObject({ connected: false });
    expect(requests[0]).toMatchObject({
      path: "/v1/integrations/zoom/connection/disconnect",
      method: "POST",
    });
  });

  it("treats an unreadable status as not connected", () => {
    expect(normalizeZoomStatus(null)).toEqual({
      available: true,
      connected: false,
      zoomEmail: null,
      connectedAt: null,
      needsReconnect: false,
    });
  });
});

describe("zoomReturnNotice", () => {
  it("confirms a connection", () => {
    expect(zoomReturnNotice("?integration=zoom&status=connected")).toEqual({
      tone: "success",
      text: "Zoom connected.",
    });
  });

  it("explains a declined consent", () => {
    expect(
      zoomReturnNotice("?integration=zoom&status=denied&reason=access_denied"),
    ).toEqual({ tone: "error", text: "Zoom access was not granted." });
  });

  it("explains an expired sign-in link", () => {
    expect(
      zoomReturnNotice("?integration=zoom&status=error&reason=link_expired")
        ?.text,
    ).toMatch(/expired/);
  });

  it("never echoes an unknown reason back to the page", () => {
    const notice = zoomReturnNotice(
      "?integration=zoom&status=error&reason=%3Cscript%3E",
    );
    expect(notice?.text).toBe("Zoom could not be connected. Please try again.");
  });

  it("ignores other integrations' return addresses", () => {
    expect(zoomReturnNotice("?calendar=google&status=connected")).toBeNull();
  });
});
