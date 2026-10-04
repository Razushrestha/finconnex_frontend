/**
 * Browser side of the guest booking flow: thin wrappers over
 * `/api/book/[slug]/{slots,book,manage}`. Failures are returned, never thrown,
 * with the stable `code` the routes set and a message that is safe to show.
 */

import {
  parseCrmPublicRef,
  parsePublicSlotDays,
  type CrmPublicRef,
  type PublicCrmFailure,
  type PublicSlotDays,
} from "@/lib/booking/public-crm";

export type PublicClientFailure = PublicCrmFailure | "not_connected";

/**
 * A guest booking the CRM refused. Thrown by `confirmPublicBooking` so the page
 * can tell "pick another time" (`slot_unavailable`) from other failures; the
 * message is safe to show the guest.
 */
export class PublicBookingError extends Error {
  readonly code: PublicClientFailure;
  constructor(code: PublicClientFailure, message: string) {
    super(message);
    this.name = "PublicBookingError";
    this.code = code;
  }
}

/** Longest the guest waits on one request before it counts as unavailable. */
const REQUEST_TIMEOUT_MS = 30_000;

export type PublicFailure = {
  ok: false;
  code: PublicClientFailure;
  message: string;
};

export type PublicSlotsResult =
  | { ok: true; days: PublicSlotDays }
  | PublicFailure;

export type PublicBookedResult =
  | {
      ok: true;
      bookingId: string;
      startAt?: string;
      hostName?: string;
      cancelToken?: string;
      rescheduleToken?: string;
    }
  | PublicFailure;

export type PublicManagedResult =
  | {
      ok: true;
      bookingId?: string;
      status?: string;
      startAt?: string;
      cancelToken?: string;
      rescheduleToken?: string;
    }
  | PublicFailure;

const CODES: readonly PublicClientFailure[] = [
  "slot_unavailable",
  "not_found",
  "rate_limited",
  "invalid",
  "unavailable",
  "not_connected",
];

function endpoint(slug: string, route: "slots" | "book" | "manage" | "site"): string {
  return `/api/book/${encodeURIComponent(slug)}/${route}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(rec: Record<string, unknown> | null, key: string): string | undefined {
  const value = rec?.[key];
  return typeof value === "string" && value ? value : undefined;
}

type CallResult = { ok: true; json: unknown } | PublicFailure;

async function call(url: string, init?: RequestInit): Promise<CallResult> {
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true, json };
    const rec = asRecord(json);
    const code = CODES.find((c) => c === rec?.code) ?? "unavailable";
    return {
      ok: false,
      code,
      message: str(rec, "error") ?? "The booking service is unavailable right now.",
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Could not reach the booking service. Check your connection and try again.",
    };
  }
}

function post(url: string, body: unknown): Promise<CallResult> {
  return call(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * The CRM address the host published for this page, or null. A copy of the page
 * saved in this browser before the host connected it has none, so the page
 * asks the server once. Never throws; waits at most a few seconds.
 */
export async function fetchPublishedCrmRef(slug: string): Promise<CrmPublicRef | null> {
  try {
    const res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    return parseCrmPublicRef(asRecord(await res.json())?.crmPublic);
  } catch {
    return null;
  }
}

/** Open slots between two `YYYY-MM-DD` dates, grouped by day in `timezone`. */
export async function fetchPublicSlots(
  slug: string,
  range: { from: string; to: string; timezone?: string },
): Promise<PublicSlotsResult> {
  const query = new URLSearchParams({ from: range.from, to: range.to });
  if (range.timezone) query.set("timezone", range.timezone);
  const res = await call(`${endpoint(slug, "slots")}?${query.toString()}`);
  if (!res.ok) return res;
  return { ok: true, days: parsePublicSlotDays(res.json) };
}

/** A public service (event type) listed on the workspace booking site. */
export type PublicSiteService = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
};

/** The workspace booking site: its branding and the services guests can book. */
export async function fetchPublicSite(
  slug: string,
): Promise<{ branding: unknown; services: PublicSiteService[] } | null> {
  const res = await call(endpoint(slug, "site"));
  if (!res.ok) return null;
  const rec = asRecord(res.json);
  if (!rec) return null;
  const services = (Array.isArray(rec.services) ? rec.services : [])
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => !!row)
    .map((row) => ({
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      durationMinutes: Number(row.durationMinutes) || 0,
    }))
    .filter((row) => row.id && row.name);
  return { branding: rec.branding ?? null, services };
}

export async function bookPublicSlot(
  slug: string,
  input: {
    startAt: string;
    name: string;
    email: string;
    phone?: string;
    notes?: string;
    timezone?: string;
    hostId?: string;
  },
): Promise<PublicBookedResult> {
  const res = await post(endpoint(slug, "book"), input);
  if (!res.ok) return res;
  const rec = asRecord(res.json);
  const bookingId = str(rec, "bookingId");
  if (!bookingId) {
    return {
      ok: false,
      code: "unavailable",
      message: "The booking service sent an unexpected reply.",
    };
  }
  return {
    ok: true,
    bookingId,
    startAt: str(rec, "startAt"),
    hostName: str(rec, "hostName"),
    cancelToken: str(rec, "cancelToken"),
    rescheduleToken: str(rec, "rescheduleToken"),
  };
}

export async function managePublicBooking(
  slug: string,
  input:
    | { action: "cancel"; token: string; reason?: string }
    | { action: "reschedule"; token: string; startAt: string; timezone?: string },
): Promise<PublicManagedResult> {
  const res = await post(endpoint(slug, "manage"), input);
  if (!res.ok) return res;
  const rec = asRecord(res.json);
  return {
    ok: true,
    bookingId: str(rec, "bookingId"),
    status: str(rec, "status"),
    startAt: str(rec, "startAt"),
    cancelToken: str(rec, "cancelToken"),
    rescheduleToken: str(rec, "rescheduleToken"),
  };
}
