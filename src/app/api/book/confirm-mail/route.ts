import { NextResponse } from "next/server";
import { sendViaSendGrid } from "@/lib/emails/sendgrid-server";

function sameSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  if (site === "cross-site") return false;
  try {
    const origin = request.headers.get("origin");
    if (origin) {
      return new URL(origin).origin === new URL(request.url).origin;
    }
    const referer = request.headers.get("referer");
    if (referer) {
      return new URL(referer).origin === new URL(request.url).origin;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Guest booking confirmation mail. No dashboard session — public /book only.
 * Requires SendGrid env on the host (Vercel: SENDGRID_API_KEY + SENDGRID_FROM_EMAIL).
 */
export async function POST(request: Request) {
  if (!sameSiteRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";
  const text =
    typeof body.text === "string" && body.text.trim()
      ? body.text
      : html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!to.includes("@") || !subject || (!html.trim() && !text.trim())) {
    return NextResponse.json(
      { error: "to, subject, and body are required" },
      { status: 400 },
    );
  }
  if (subject.length > 200 || html.length > 200_000 || text.length > 50_000) {
    return NextResponse.json({ error: "Message is too large" }, { status: 413 });
  }

  try {
    await sendViaSendGrid({
      to: [to],
      subject,
      text: text || subject,
      html: html.trim() || undefined,
    });
    return NextResponse.json({ ok: true, delivered: "sendgrid" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send email";
    const status = /not configured/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
