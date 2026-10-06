import { NextResponse } from "next/server";
import { crmAuthBaseUrl } from "@/lib/auth/public-api";
import { joinUrlFromRecord } from "@/lib/booking/meeting-link";
import { callPublicCrm, publicBookingPath } from "@/lib/booking/public-crm";
import {
  crmFailureResponse,
  notConnectedResponse,
  publishedCrmRef,
  rejectForeignRequest,
  validTimeZone,
} from "@/lib/booking/public-crm-server";

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const HOST_ID = /^[A-Za-z0-9_-]{1,64}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function invalid(message: string) {
  return NextResponse.json({ error: message, code: "invalid" }, { status: 400 });
}

/**
 * A signed-out guest books an exact slot of the CRM event type behind a
 * published page. The CRM creates the booking and its lead; the cancel and
 * reschedule tokens come back so the guest can manage it later.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;

  const { slug } = await context.params;
  const ref = await publishedCrmRef(slug);
  if (!ref) return notConnectedResponse();

  const body = asRecord(await request.json().catch(() => null));
  if (!body) return invalid("Send the booking details as JSON");

  const startMs = typeof body.startAt === "string" ? Date.parse(body.startAt) : NaN;
  if (Number.isNaN(startMs)) return invalid("Choose a valid time");

  const name = text(body.name, 255);
  const email = text(body.email, 320);
  if (!name) return invalid("Enter your name");
  if (!EMAIL.test(email)) return invalid("Enter a valid email address");

  const phone = text(body.phone, 40);
  const notes = text(body.notes, 5000);
  const timezone = validTimeZone(body.timezone);
  const hostId = typeof body.hostId === "string" ? body.hostId.trim() : "";
  if (hostId && !HOST_ID.test(hostId)) return invalid("Choose a valid host");

  const result = await callPublicCrm(crmAuthBaseUrl(), publicBookingPath(ref, "/book"), {
    method: "POST",
    body: {
      name,
      email,
      startAt: new Date(startMs).toISOString(),
      ...(phone ? { phone } : {}),
      ...(notes ? { notes } : {}),
      ...(timezone ? { timezone } : {}),
      ...(hostId ? { hostId } : {}),
    },
  });
  if (!result.ok) return crmFailureResponse(result);

  const booking = asRecord(result.data);
  const bookingId = typeof booking?.id === "string" ? booking.id : "";
  if (!bookingId) {
    // The CRM accepted the request but sent nothing we can track.
    return crmFailureResponse({
      ok: false,
      status: 502,
      code: "unavailable",
      message: "Unexpected response",
    });
  }
  const host = asRecord(booking?.host);
  const meetingLink = joinUrlFromRecord(booking);
  return NextResponse.json({
    bookingId,
    startAt: typeof booking?.startAt === "string" ? booking.startAt : undefined,
    hostName: typeof host?.name === "string" ? host.name : undefined,
    cancelToken: typeof booking?.cancelToken === "string" ? booking.cancelToken : undefined,
    rescheduleToken:
      typeof booking?.rescheduleToken === "string" ? booking.rescheduleToken : undefined,
    ...(meetingLink ? { meetingLink } : {}),
  });
}
