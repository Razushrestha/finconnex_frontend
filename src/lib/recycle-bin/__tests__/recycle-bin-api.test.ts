import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bindCrmSession } from "@/lib/activity-timeline";
import {
  listCrmRecycleBin,
  RECYCLE_ENTITY_TYPES,
  recycleEntityTypeOf,
  restoreCrmRecycleBinItem,
} from "@/lib/recycle-bin/api";

/** RecycleBinListFiltersDto + the API's forbidNonWhitelisted validation pipe. */
const BACKEND_TYPES = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
  "TASK",
  "EMAIL",
  "MESSAGE",
  "DOCUMENT",
  "DOCUMENT_REQUEST",
];
const ALLOWED_PARAMS = new Set(["entityType", "page", "limit"]);

const LEAD = {
  id: "e344de3b-efe2-4800-919e-9693d204e80f",
  entityType: "LEAD",
  label: "Binayak Binayak",
  deletedAt: "2026-09-17T11:00:29.644Z",
};
const DEAL = {
  id: "d344de3b-efe2-4800-919e-9693d204e80f",
  entityType: "DEAL",
  label: "Refinance",
  deletedAt: "2026-09-17T12:00:00.000Z",
};

describe("recycle bin API client", () => {
  const originalFetch = globalThis.fetch;
  let requests: URL[] = [];

  beforeEach(() => {
    requests = [];
    bindCrmSession({
      baseUrl: "https://crm.test",
      accessToken: "token",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requests.push(url);
      const reply = (status: number, body: unknown) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (url.pathname !== "/v1/recycle-bin") return reply(200, { data: {} });
      const unknown = [...url.searchParams.keys()].filter((key) => !ALLOWED_PARAMS.has(key));
      const type = url.searchParams.get("entityType") ?? "";
      if (unknown.length || !BACKEND_TYPES.includes(type)) {
        return reply(400, { statusCode: 400, message: "Bad Request" });
      }
      const rows = [LEAD, DEAL].filter((row) => row.entityType === type);
      return reply(200, { statusCode: 200, data: [rows, rows.length] });
    }) as typeof fetch;
  });

  afterEach(() => {
    bindCrmSession(null);
    globalThis.fetch = originalFetch;
  });

  it("lists every type the API supports and only sends parameters it accepts", async () => {
    const rows = await listCrmRecycleBin({ limit: 100 });
    expect(rows.map((row) => row.recordLabel)).toEqual(["Refinance", "Binayak Binayak"]);
    expect(requests.every((url) => url.searchParams.get("entityType") !== null)).toBe(true);
    expect(new Set(requests.map((url) => url.searchParams.get("entityType")))).toEqual(
      new Set(BACKEND_TYPES),
    );
  });

  it("filters to one type in the API's spelling", async () => {
    const rows = await listCrmRecycleBin({ entityType: "LEAD" });
    expect(rows).toHaveLength(1);
    expect(requests.map((url) => url.searchParams.get("entityType"))).toEqual(["LEAD"]);
  });

  it("offers exactly the API's types", () => {
    expect([...RECYCLE_ENTITY_TYPES]).toEqual(BACKEND_TYPES);
  });

  it("fails loudly when the recycle bin cannot be read at all", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ statusCode: 403, message: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    await expect(listCrmRecycleBin()).rejects.toThrow();
  });

  it("restores with the API's entity type spelling", async () => {
    const [lead] = await listCrmRecycleBin({ entityType: "LEAD" });
    expect(recycleEntityTypeOf(lead)).toBe("LEAD");
    await restoreCrmRecycleBinItem(recycleEntityTypeOf(lead), lead.recordId);
    expect(requests.at(-1)?.pathname).toBe(`/v1/recycle-bin/LEAD/${LEAD.id}/restore`);
  });
});
