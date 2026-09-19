import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shown = vi.hoisted(() => ({ success: [] as string[], error: [] as Array<[string, string]> }));

vi.mock("sonner", () => {
  const base = Object.assign(() => undefined, {
    success: (text: string) => shown.success.push(text),
    error: (text: string, opts?: { description?: string }) => shown.error.push([text, opts?.description ?? ""]),
    info: () => undefined,
    warning: () => undefined,
    message: () => undefined,
    loading: () => undefined,
    promise: () => undefined,
  });
  return { toast: base };
});

const ID = "6615fff8-a645-4da9-8f27-1796b97f22cf";
type Listener = () => void;

/** A bare `window` whose fetch answers from `respond`. */
function fakeWindow(respond: (url: string, init?: RequestInit) => Response) {
  const listeners: Record<string, Listener[]> = {};
  const send = vi.fn(async (url: string, init?: RequestInit) => respond(url, init));
  const win = {
    location: { origin: "http://localhost:3000" },
    /** The network; `fetch` itself is replaced once the notifier installs. */
    send,
    fetch: send as typeof fetch,
    addEventListener: (type: string, fn: Listener) => {
      (listeners[type] ??= []).push(fn);
    },
    userInput: () => listeners.pointerdown?.forEach((fn) => fn()),
  };
  return win;
}

async function load() {
  vi.resetModules();
  const notifier = await import("@/lib/notify/fetch-notifier");
  const { toast } = await import("@/lib/notify/toast");
  return { ...notifier, toast };
}

describe("installFetchNotifier", () => {
  let win: ReturnType<typeof fakeWindow>;

  beforeEach(() => {
    vi.useFakeTimers();
    shown.success.length = 0;
    shown.error.length = 0;
    win = fakeWindow((url) =>
      url.includes("?fail")
        ? new Response(JSON.stringify({ message: "crm.error.emailTakenByContact" }), { status: 400 })
        : new Response("{}", { status: 201 }),
    );
    vi.stubGlobal("window", win);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("toasts a write the user made, once it lands", async () => {
    const { installFetchNotifier } = await load();
    installFetchNotifier();
    win.userInput();
    await window.fetch("/api/auth/crm/leads", { method: "POST" });
    expect(shown.success).toEqual([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(shown.success).toEqual(["Lead created"]);
  });

  it("shows the server's reason when a write fails", async () => {
    const { installFetchNotifier } = await load();
    installFetchNotifier();
    win.userInput();
    await window.fetch(`/api/auth/crm/leads/${ID}?fail`, { method: "PATCH" });
    await vi.advanceTimersByTimeAsync(1300);
    expect(shown.error).toEqual([["Couldn't update lead", "Email taken by contact"]]);
  });

  it("stays quiet when the screen shows its own toast", async () => {
    const { installFetchNotifier, toast } = await load();
    installFetchNotifier();
    win.userInput();
    await window.fetch("/api/auth/crm/tasks", { method: "POST" });
    toast.success("Task saved to CRM");
    await vi.advanceTimersByTimeAsync(400);
    expect(shown.success).toEqual(["Task saved to CRM"]);
  });

  it("stays quiet for writes that don't follow user input", async () => {
    const { installFetchNotifier } = await load();
    installFetchNotifier();
    await window.fetch("/api/auth/crm/contacts", { method: "POST" });
    await vi.advanceTimersByTimeAsync(400);
    expect(shown.success).toEqual([]);
  });

  it("counts repeats of one event in a single toast", async () => {
    const { installFetchNotifier } = await load();
    installFetchNotifier();
    win.userInput();
    for (let i = 0; i < 3; i++) await window.fetch(`/api/auth/crm/deals/${ID}`, { method: "DELETE" });
    await vi.advanceTimersByTimeAsync(400);
    expect(shown.success).toEqual(["Deal deleted (3)"]);
  });

  it("shows only a retried write's final outcome", async () => {
    let attempt = 0;
    win.send.mockImplementation(async () =>
      ++attempt === 1 ? new Response("{}", { status: 404 }) : new Response("{}", { status: 200 }),
    );
    const { installFetchNotifier } = await load();
    installFetchNotifier();
    win.userInput();
    await window.fetch(`/api/auth/crm/tasks/${ID}`, { method: "PATCH" });
    await window.fetch(`/api/auth/crm/tasks/${ID}`, { method: "PATCH" });
    await vi.advanceTimersByTimeAsync(1500);
    expect(shown.error).toEqual([]);
    expect(shown.success).toEqual(["Task updated"]);
  });

  it("lets a request opt out", async () => {
    const { installFetchNotifier, silentRequest } = await load();
    installFetchNotifier();
    win.userInput();
    await window.fetch("/api/auth/crm/leads", silentRequest({ method: "POST" }));
    await vi.advanceTimersByTimeAsync(400);
    expect(shown.success).toEqual([]);
    const sent = win.send.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(sent.headers).has("x-finconnex-silent")).toBe(false);
  });
});
