/**
 * App-wide toasts for saves: every write the browser sends to the CRM (or to
 * the app's own send/sign routes) shows a toast when it lands — "Lead
 * created", "Task completed" — and an error toast with the server's reason
 * when it fails. Screens need no code for it.
 *
 * It wraps `window.fetch` once, so every client (crmFetch, the BFF proxy,
 * httpRequest, direct fetch calls) is covered. It stays out of the way:
 *
 * - Requests request-events.ts doesn't name (reads, sync, look-ups) pass
 *   straight through, and so does any write that doesn't follow a click,
 *   key press or form submit — sync and polling the app does on its own.
 * - A screen that shows its own toast for the save wins; the automatic one is
 *   held briefly and dropped (see toast.ts).
 * - A retried request (token refresh) shows only its final outcome.
 * - Repeats of one event (deleting ten leads one by one) share one toast
 *   with a count.
 * - A request can opt out with `silentRequest(init)`.
 */

import { crmErrorMessage } from "@/lib/crm/request";
import { describeRequestEvent, readableErrorMessage, type RequestEvent } from "@/lib/notify/request-events";
import { automaticToast, explicitToastShownAt } from "@/lib/notify/toast";

const SILENT_HEADER = "x-finconnex-silent";

/** Held so a screen's own toast, or a retry, can replace it. */
const SUCCESS_DELAY_MS = 350;
/** Longer: a failed request may be retried after a token refresh. */
const FAILURE_DELAY_MS = 1200;
/** Repeats of one event within this window share a toast. */
const GROUP_WINDOW_MS = 4000;
/** A write started this long after the user's last input is background work. */
const USER_ACTION_WINDOW_MS = 15_000;

let lastUserInputAt = 0;

const pending = new Map<string, ReturnType<typeof setTimeout>>();
/** When the latest attempt of each event started; older attempts stay quiet. */
const latestAttempt = new Map<string, number>();
const groups = new Map<string, { count: number; at: number }>();

/** `init` with automatic toasts turned off for this one request. */
export function silentRequest(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set(SILENT_HEADER, "1");
  return { ...init, headers };
}

function crmOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_CRM_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "https://finconnex.payperless.app",
  ]) {
    try {
      if (raw?.trim()) origins.add(new URL(raw.trim()).origin);
    } catch {
      /* not a URL */
    }
  }
  return origins;
}

function requestParts(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (request?.url ?? "");
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? request?.headers);
  return { url, method, headers };
}

function failureReason(status: number, body: unknown): string {
  const fallback =
    status === 403
      ? "You don't have permission to do that."
      : status === 404
        ? "It may have been deleted. Refresh and try again."
        : status === 409
          ? "Someone else changed it. Refresh and try again."
          : status === 413
            ? "That's too large to upload."
            : status === 429
              ? "Too many requests. Wait a moment and try again."
              : status >= 500
                ? "The server had a problem. Try again in a moment."
                : "Check the details and try again.";
  return readableErrorMessage(crmErrorMessage(body, fallback));
}

function schedule(key: string, delay: number, startedAt: number, show: () => void) {
  // A retry has started since; its outcome is the one to show.
  if (latestAttempt.get(key) !== startedAt) return;
  clearTimeout(pending.get(key));
  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key);
      // Retried since, or the screen showed its own message for this save.
      if (latestAttempt.get(key) !== startedAt) return;
      if (explicitToastShownAt() >= startedAt) return;
      show();
    }, delay),
  );
}

/** Counts this success toward its event's group; returns the group's size. */
function countSuccess(event: RequestEvent): number {
  const now = Date.now();
  const group = groups.get(event.key);
  const count = group && now - group.at < GROUP_WINDOW_MS ? group.count + 1 : 1;
  groups.set(event.key, { count, at: now });
  return count;
}

function showSuccess(event: RequestEvent, count: number) {
  automaticToast.success(count > 1 ? `${event.success} (${count})` : event.success, {
    id: `auto:${event.key}`,
  });
}

function showFailure(event: RequestEvent, reason: string) {
  automaticToast.error(event.failure, { id: `auto-error:${event.key}`, description: reason });
}

async function readJson(res: Response): Promise<unknown> {
  try {
    const text = await res.clone().text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    __finconnexFetchNotifier?: boolean;
  }
}

export function installFetchNotifier(): void {
  if (typeof window === "undefined" || window.__finconnexFetchNotifier) return;
  window.__finconnexFetchNotifier = true;

  const original = window.fetch.bind(window);
  const origins = crmOrigins();

  const noteInput = () => {
    lastUserInputAt = Date.now();
  };
  for (const type of ["pointerdown", "keydown", "submit", "change", "drop"]) {
    window.addEventListener(type, noteInput, { capture: true, passive: true });
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { url, method, headers } = requestParts(input, init);
    const silent = headers.has(SILENT_HEADER);
    if (silent) {
      headers.delete(SILENT_HEADER);
      init = { ...init, headers };
    }

    let event: RequestEvent | null = null;
    const userCaused = Date.now() - lastUserInputAt < USER_ACTION_WINDOW_MS;
    if (!silent && userCaused && !headers.has("next-action")) {
      try {
        const origin = new URL(url, window.location.origin).origin;
        if (origin === window.location.origin || origins.has(origin)) {
          event = describeRequestEvent(method, url);
        }
      } catch {
        event = null;
      }
    }
    if (!event) return original(input, init);

    // A retry of the same write replaces whatever the last attempt queued.
    clearTimeout(pending.get(event.key));
    let startedAt = Date.now();
    // Two attempts in one millisecond still need telling apart.
    if ((latestAttempt.get(event.key) ?? 0) >= startedAt) startedAt = (latestAttempt.get(event.key) ?? 0) + 1;
    latestAttempt.set(event.key, startedAt);
    const current = event;

    let res: Response;
    try {
      res = await original(input, init);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        schedule(current.key, FAILURE_DELAY_MS, startedAt, () =>
          showFailure(current, "Couldn't reach the server. Check your connection and try again."),
        );
      }
      throw err;
    }

    if (res.ok) {
      const count = countSuccess(current);
      schedule(current.key, SUCCESS_DELAY_MS, startedAt, () => showSuccess(current, count));
    } else if (res.status !== 401) {
      // 401s are refreshed and retried, or end in a sign-out.
      void readJson(res).then((body) =>
        schedule(current.key, FAILURE_DELAY_MS, startedAt, () =>
          showFailure(current, failureReason(res.status, body)),
        ),
      );
    }
    return res;
  };
}
