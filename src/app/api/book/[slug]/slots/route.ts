import { NextResponse } from "next/server";
import { crmAuthBaseUrl } from "@/lib/auth/public-api";
import {
  MAX_SLOT_WINDOW_DAYS,
  callPublicCrm,
  isIsoDate,
  publicBookingPath,
} from "@/lib/booking/public-crm";
import {
  crmFailureResponse,
  notConnectedResponse,
  publishedCrmRef,
  rejectForeignRequest,
  validTimeZone,
} from "@/lib/booking/public-crm-server";

/**
 * Open slots of the CRM event type behind a published booking page, for guests
 * who have no CRM login. `?from=YYYY-MM-DD&to=YYYY-MM-DD[&timezone=Area/City]`.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;

  const { slug } = await context.params;
  const ref = await publishedCrmRef(slug);
  if (!ref) return notConnectedResponse();

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? from;
  const spanDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (
    !isIsoDate(from) ||
    !isIsoDate(to) ||
    !(spanDays >= 0) ||
    spanDays > MAX_SLOT_WINDOW_DAYS
  ) {
    return NextResponse.json(
      { error: "Choose a valid date range", code: "invalid" },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({ from, to });
  const timezone = validTimeZone(params.get("timezone"));
  if (timezone) query.set("timezone", timezone);

  const result = await callPublicCrm(
    crmAuthBaseUrl(),
    `${publicBookingPath(ref, "/slots")}?${query.toString()}`,
  );
  if (!result.ok) return crmFailureResponse(result);
  return NextResponse.json(result.data);
}
