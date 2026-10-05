import { NextResponse } from "next/server";
import { deliverMail, sendgridConfigured } from "@/lib/emails/sendgrid-server";
import { sameSiteRequest } from "@/lib/booking/same-site";

/**
 * Guest booking confirmation mail. No dashboard session — public /book only.
 * Sends with this app's SendGrid key when set (SENDGRID_API_KEY +
 * SENDGRID_FROM_EMAIL), otherwise through the CRM using the booking's token.
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
  // Reply To / Cc from the booking page's Email Configurations. Anything that
  // is not a plain address is dropped rather than rejected: the confirmation
  // itself should still go out.
  const plainEmail = (value: unknown) =>
    typeof value === "string" && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim())
      ? value.trim()
      : "";
  const replyTo = plainEmail(body.replyTo);
  const cc = (Array.isArray(body.cc) ? body.cc : [])
    .map(plainEmail)
    .filter(Boolean)
    .slice(0, 3);
  if (subject.length > 200 || html.length > 200_000 || text.length > 50_000) {
    return NextResponse.json({ error: "Message is too large" }, { status: 413 });
  }

  // The booking's manage token lets the CRM send this through its own mail
  // account when this app has no SendGrid key.
  const bookingToken =
    typeof body.bookingToken === "string" ? body.bookingToken.trim() : "";
  if (!sendgridConfigured() && !bookingToken) {
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const delivered = await deliverMail({
      to: [to],
      subject,
      text: text || subject,
      html: html.trim() || undefined,
      cc,
      replyTo: replyTo || undefined,
    }, { bookingToken });
    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send email";
    console.error("[book/confirm-mail]", message);
    return NextResponse.json({ ok: true, delivered: false });
  }
}
