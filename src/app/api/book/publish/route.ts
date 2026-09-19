import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writePublicBookingPage } from "@/lib/booking/public-book-store";
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
  await writePublicBookingPage(page);
  return NextResponse.json({ ok: true, slug: page.slug });
}
