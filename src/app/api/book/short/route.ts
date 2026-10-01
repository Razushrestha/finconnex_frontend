import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveBookingShortLink } from "@/lib/booking/short-link-store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to create a short link" }, { status: 401 });
  }

  let body: { code?: string; target?: string; once?: boolean };
  try {
    body = (await request.json()) as { code?: string; target?: string; once?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid short link" }, { status: 400 });
  }

  try {
    const saved = await saveBookingShortLink(
      String(body.code ?? ""),
      String(body.target ?? ""),
      Boolean(body.once),
    );
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the short link";
    const status = /already exists/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
