import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  readPublicBookingPage,
  writePublicBookingPage,
} from "@/lib/booking/public-book-store";
import { parseCrmPublicRef } from "@/lib/booking/public-crm";
import type { BookingPage } from "@/lib/booking/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to publish a booking page" }, { status: 401 });
  }
  let page: BookingPage;
  try {
    page = (await request.json()) as BookingPage;
  } catch {
    return NextResponse.json({ error: "Invalid booking page" }, { status: 400 });
  }
  if (!page?.slug && !page?.title) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  // `crmPublic` is the address guests book through. Keep only well-formed
  // slugs, and when this save could not work it out (CRM briefly unreachable),
  // keep the one already published for the same event type so the page does
  // not silently stop reaching the CRM.
  let crmPublic = parseCrmPublicRef(page.crmPublic);
  if (!crmPublic) {
    const previous = await readPublicBookingPage(page.slug || page.title);
    const sameEventType =
      !!previous && (previous.crmEventTypeId || previous.id) === (page.crmEventTypeId || page.id);
    crmPublic = sameEventType ? parseCrmPublicRef(previous.crmPublic) : null;
  }
  await writePublicBookingPage({ ...page, crmPublic: crmPublic ?? undefined });
  return NextResponse.json({ ok: true, slug: page.slug });
}
