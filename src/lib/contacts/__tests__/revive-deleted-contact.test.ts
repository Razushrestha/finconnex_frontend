import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bindCrmSession } from "@/lib/activity-timeline";
import { createCrmContact } from "@/lib/contacts/api";

const CONTACT = "11111111-1111-4111-8111-111111111111";
const EMAIL = "razu@example.com";

describe("createCrmContact recycle-bin conflict", () => {
  const originalFetch = globalThis.fetch;
  let calls: { method: string; pathname: string }[] = [];

  beforeEach(() => {
    calls = [];
    bindCrmSession({
      baseUrl: "https://crm.test",
      accessToken: "token",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ method, pathname: url.pathname });
      const reply = (status: number, body: unknown) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (method === "POST" && url.pathname === "/v1/contacts") {
        return reply(409, {
          statusCode: 409,
          message:
            "A deleted contact in the recycle bin still uses this email address. Restore or permanently delete it first",
        });
      }
      if (method === "GET" && url.pathname === "/v1/recycle-bin") {
        return reply(200, {
          data: [
            [
              {
                id: CONTACT,
                entityType: "CONTACT",
                label: "Ram",
                snapshot: { email: EMAIL },
              },
            ],
            1,
          ],
        });
      }
      if (method === "POST" && url.pathname === `/v1/recycle-bin/CONTACT/${CONTACT}/restore`) {
        return reply(200, { data: { ok: true } });
      }
      if (method === "GET" && url.pathname === "/v1/contacts") {
        return reply(200, {
          data: [
            {
              id: CONTACT,
              firstName: "Ram",
              lastName: "Bahadur",
              email: EMAIL,
              status: "ACTIVE",
            },
          ],
        });
      }
      return reply(404, { message: "not found" });
    }) as typeof fetch;
  });

  afterEach(() => {
    bindCrmSession(null);
    globalThis.fetch = originalFetch;
  });

  it("restores the deleted contact instead of failing the create", async () => {
    const created = await createCrmContact({
      firstName: "Ram",
      lastName: "Bahadur",
      email: EMAIL,
      status: "Active",
      owner: "",
    });
    expect(created?.contact.id).toBe(CONTACT);
    expect(created?.contact.email).toBe(EMAIL);
    expect(calls.map((call) => `${call.method} ${call.pathname}`)).toEqual([
      "POST /v1/contacts",
      "GET /v1/recycle-bin",
      `POST /v1/recycle-bin/CONTACT/${CONTACT}/restore`,
      "GET /v1/contacts",
    ]);
  });
});
