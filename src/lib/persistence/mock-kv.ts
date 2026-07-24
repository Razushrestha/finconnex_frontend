/**
 * In-memory KV backend that implements the Phase 9/10 `/v1/kv/{scopedKey}` contract.
 * Use as `fetchImpl` in tests and Session 10 smokes — no network required.
 */

export type MockKvBackend = {
  store: Map<string, string>;
  fetchImpl: typeof fetch;
  /** Seed a tenant-scoped key (already includes `fc:{tenant}:` prefix). */
  seed: (scopedKey: string, value: string) => void;
};

function parseScopedFromUrl(url: string): string | null {
  const match = url.match(/\/v1\/kv\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return match[1] ?? null;
  }
}

export function createMockKvBackend(): MockKvBackend {
  const store = new Map<string, string>();

  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const scoped = parseScopedFromUrl(url);
    if (!scoped) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "GET") {
      const value = store.get(scoped);
      if (value == null) {
        return new Response(JSON.stringify({ error: "missing" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ value }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PUT") {
      let body: { value?: string } = {};
      try {
        body = JSON.parse(String(init?.body ?? "{}")) as { value?: string };
      } catch {
        return new Response(JSON.stringify({ error: "bad_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (typeof body.value !== "string") {
        return new Response(JSON.stringify({ error: "value_required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      store.set(scoped, body.value);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      store.delete(scoped);
      return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return {
    store,
    fetchImpl,
    seed(scopedKey, value) {
      store.set(scopedKey, value);
    },
  };
}
