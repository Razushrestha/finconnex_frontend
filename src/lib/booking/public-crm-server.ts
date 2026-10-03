import { NextResponse } from "next/server";
import { readPublicBookingPage } from "@/lib/booking/public-book-store";
import {
  parseCrmPublicRef,
  type CrmPublicRef,
  type PublicCrmResult,
} from "@/lib/booking/public-crm";
import { sameSiteRequest } from "@/lib/booking/same-site";

/** Shared plumbing for the `/api/book/[slug]/{slots,book,manage}` routes. */

/** Returns the rejection to send, or null when the request may proceed. */
export function rejectForeignRequest(request: Request): NextResponse | null {
  return sameSiteRequest(request)
    ? null
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * The CRM event type a published page books into, or null when the page was
 * never published with one (the page then falls back to its local flow).
 */
export async function publishedCrmRef(slug: string): Promise<CrmPublicRef | null> {
  const page = await readPublicBookingPage(slug);
  return page ? parseCrmPublicRef(page.crmPublic) : null;
}

export function notConnectedResponse(): NextResponse {
  return NextResponse.json(
    { error: "This page is not connected to the CRM", code: "not_connected" },
    { status: 404 },
  );
}

const FAILURE_STATUS = {
  slot_unavailable: 409,
  not_found: 404,
  rate_limited: 429,
  invalid: 400,
  unavailable: 502,
} as const;

const FAILURE_MESSAGE = {
  slot_unavailable: "That time was just booked. Please choose another time.",
  not_found: "This booking could not be found.",
  rate_limited: "Too many requests. Please try again in a minute.",
  invalid: "Those booking details were not accepted.",
  unavailable: "The booking service is unavailable right now.",
} as const;

/** A failure in the shape the page reads: stable `code`, guest-safe `error`. */
export function crmFailureResponse(
  result: Extract<PublicCrmResult, { ok: false }>,
): NextResponse {
  return NextResponse.json(
    { error: FAILURE_MESSAGE[result.code], code: result.code },
    { status: FAILURE_STATUS[result.code] },
  );
}

/** Rejects names that `Intl` does not know, so the backend never sees them. */
export function validTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 100) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() });
    return value.trim();
  } catch {
    return "";
  }
}
