import { NextResponse } from "next/server";
import { crmAuthBaseUrl } from "@/lib/auth/public-api";
import { callPublicCrm, publicManagePath } from "@/lib/booking/public-crm";
import {
  crmFailureResponse,
  notConnectedResponse,
  publishedCrmRef,
  rejectForeignRequest,
  validTimeZone,
} from "@/lib/booking/public-crm-server";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function invalid(message: string) {
  return NextResponse.json({ error: message, code: "invalid" }, { status: 400 });
}

/**
 * Cancel or reschedule a booking a guest made through `/book`, addressed by the
 * secret token the CRM returned when it was created.
 * Body: `{ action: "cancel" | "reschedule", token, startAt?, timezone?, reason? }`.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;

  // Only pages that were published against the CRM may use this route.
  const { slug } = await context.params;
  if (!(await publishedCrmRef(slug))) return notConnectedResponse();

  const body = asRecord(await request.json().catch(() => null));
  if (!body) return invalid("Send the request as JSON");

  const action = body.action;
  if (action !== "cancel" && action !== "reschedule") {
    return invalid("Choose cancel or reschedule");
  }
  const path = publicManagePath(typeof body.token === "string" ? body.token : "", action);
  if (!path) return invalid("That booking link is not valid");

  let payload: Record<string, unknown>;
  if (action === "reschedule") {
    const startMs = typeof body.startAt === "string" ? Date.parse(body.startAt) : NaN;
    if (Number.isNaN(startMs)) return invalid("Choose a valid time");
    const timezone = validTimeZone(body.timezone);
    payload = {
      startAt: new Date(startMs).toISOString(),
      ...(timezone ? { timezone } : {}),
    };
  } else {
    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    payload = reason ? { reason } : {};
  }

  const result = await callPublicCrm(crmAuthBaseUrl(), path, {
    method: "POST",
    body: payload,
  });
  if (!result.ok) return crmFailureResponse(result);

  // A reschedule makes a new booking with new tokens; a cancel just echoes status.
  const booking = asRecord(result.data);
  const str = (key: string) =>
    typeof booking?.[key] === "string" ? (booking[key] as string) : undefined;
  return NextResponse.json({
    bookingId: str("id"),
    status: str("status"),
    startAt: str("startAt"),
    cancelToken: str("cancelToken"),
    rescheduleToken: str("rescheduleToken"),
  });
}
