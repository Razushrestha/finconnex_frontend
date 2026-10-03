import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureCrmSession: vi.fn(),
  getCrmWorkspace: vi.fn(),
  listCrmEventTypes: vi.fn(),
  listCrmEventTypeHosts: vi.fn(),
}));

vi.mock("@/lib/activity-timeline/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/activity-timeline/auth")>()),
  ensureCrmSession: mocks.ensureCrmSession,
}));
vi.mock("@/lib/workspaces/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/workspaces/api")>()),
  getCrmWorkspace: mocks.getCrmWorkspace,
}));
vi.mock("@/lib/booking/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/api")>()),
  listCrmEventTypes: mocks.listCrmEventTypes,
  listCrmEventTypeHosts: mocks.listCrmEventTypeHosts,
}));

import { clearCrmPublicRefCache, resolveCrmPublicRef } from "@/lib/booking/public-crm-ref";
import { normalizeCrmBookingHost } from "@/lib/booking/api";

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVENT_TYPE = "11111111-1111-4111-8111-111111111111";
const page = { id: EVENT_TYPE, crmEventTypeId: EVENT_TYPE };

const eventType = (over: Record<string, unknown> = {}) => ({
  id: EVENT_TYPE,
  name: "Ram test",
  slug: "ram-test",
  active: true,
  isPublic: true,
  ...over,
});
const host = (over: Record<string, unknown> = {}) =>
  normalizeCrmBookingHost({ id: "h1", name: "Mohit", slug: "mohit", isActive: true, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  clearCrmPublicRefCache();
  mocks.ensureCrmSession.mockResolvedValue({ workspaceId: WORKSPACE });
  mocks.getCrmWorkspace.mockResolvedValue({ id: WORKSPACE, slug: "acme" });
  mocks.listCrmEventTypes.mockResolvedValue([eventType()]);
  mocks.listCrmEventTypeHosts.mockResolvedValue([host()]);
});

describe("resolveCrmPublicRef", () => {
  it("works out the workspace, host and event type slugs", async () => {
    expect(await resolveCrmPublicRef(page)).toEqual({
      workspaceSlug: "acme",
      hostSlug: "mohit",
      eventTypeSlug: "ram-test",
    });
    expect(mocks.listCrmEventTypeHosts).toHaveBeenCalledWith(EVENT_TYPE);
    expect(mocks.getCrmWorkspace).toHaveBeenCalledWith(WORKSPACE);
  });

  it("uses the first active host that has a slug", async () => {
    mocks.listCrmEventTypeHosts.mockResolvedValue([
      host({ id: "h0", slug: "retired", isActive: false, active: false }),
      host({ id: "h1", slug: undefined }),
      host({ id: "h2", slug: "spare" }),
    ]);
    expect((await resolveCrmPublicRef(page))?.hostSlug).toBe("spare");
  });

  it("remembers the answer, because every save of a live page republishes it", async () => {
    await resolveCrmPublicRef(page);
    await resolveCrmPublicRef(page);
    await resolveCrmPublicRef({ id: "ignored", crmEventTypeId: EVENT_TYPE });
    expect(mocks.listCrmEventTypes).toHaveBeenCalledTimes(1);
    expect(mocks.getCrmWorkspace).toHaveBeenCalledTimes(1);
  });

  it("looks again after the cache expires", async () => {
    vi.useFakeTimers();
    try {
      await resolveCrmPublicRef(page);
      vi.advanceTimersByTime(11 * 60 * 1000);
      mocks.listCrmEventTypes.mockResolvedValue([eventType({ slug: "ram-test-renamed" })]);
      expect((await resolveCrmPublicRef(page))?.eventTypeSlug).toBe("ram-test-renamed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not remember a failure", async () => {
    mocks.listCrmEventTypeHosts.mockRejectedValueOnce(new Error("503"));
    expect(await resolveCrmPublicRef(page)).toBeNull();
    expect(await resolveCrmPublicRef(page)).not.toBeNull();
  });

  it("keeps workspaces apart", async () => {
    await resolveCrmPublicRef(page);
    mocks.ensureCrmSession.mockResolvedValue({ workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    mocks.getCrmWorkspace.mockResolvedValue({ slug: "globex" });
    expect((await resolveCrmPublicRef(page))?.workspaceSlug).toBe("globex");
  });

  it.each([
    ["the host is not signed in", () => mocks.ensureCrmSession.mockResolvedValue(null)],
    ["the CRM session lookup fails", () => mocks.ensureCrmSession.mockRejectedValue(new Error("x"))],
    ["the workspace has no slug", () => mocks.getCrmWorkspace.mockResolvedValue({ slug: "" })],
    ["the workspace cannot be read", () => mocks.getCrmWorkspace.mockResolvedValue(null)],
    ["the event type is gone", () => mocks.listCrmEventTypes.mockResolvedValue([])],
    [
      "the event type is switched off",
      () => mocks.listCrmEventTypes.mockResolvedValue([eventType({ active: false })]),
    ],
    [
      "the event type is private (the public API would refuse it)",
      () => mocks.listCrmEventTypes.mockResolvedValue([eventType({ isPublic: false })]),
    ],
    ["the event type has no slug", () => mocks.listCrmEventTypes.mockResolvedValue([eventType({ slug: "" })])],
    ["it has no hosts", () => mocks.listCrmEventTypeHosts.mockResolvedValue([])],
    [
      "no host has a slug",
      () => mocks.listCrmEventTypeHosts.mockResolvedValue([host({ slug: undefined })]),
    ],
    [
      "a slug is not a plain slug",
      () => mocks.listCrmEventTypes.mockResolvedValue([eventType({ slug: "a/b" })]),
    ],
    ["the CRM is down", () => mocks.listCrmEventTypes.mockRejectedValue(new Error("503"))],
  ])("gives up quietly when %s", async (_label, arrange) => {
    arrange();
    expect(await resolveCrmPublicRef(page)).toBeNull();
  });

  it("gives up for a page that is not backed by a CRM event type", async () => {
    expect(await resolveCrmPublicRef({ id: "bp-local", crmEventTypeId: "" })).toBeNull();
    expect(mocks.ensureCrmSession).not.toHaveBeenCalled();
  });

  it("treats an event type that does not say whether it is public as public", async () => {
    mocks.listCrmEventTypes.mockResolvedValue([eventType({ isPublic: undefined })]);
    expect(await resolveCrmPublicRef(page)).not.toBeNull();
  });
});
