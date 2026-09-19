import { NextResponse } from "next/server";
import { readPublicBookingPage } from "@/lib/booking/public-book-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const page = await readPublicBookingPage(slug);
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(page);
}
