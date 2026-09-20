import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendViaSendGrid } from "@/lib/emails/sendgrid-server";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

type AttachmentIn = {
  filename?: string;
  type?: string;
  content?: string;
  disposition?: "attachment" | "inline";
  contentId?: string;
};

/** Guest /book confirmation mail sets this; no dashboard session required. */
const BOOK_MAIL_HEADER = "x-finconnex-book-mail";

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  try {
    const origin = request.headers.get("origin");
    if (!origin) {
      // Same-origin navigations / some browsers omit Origin on POST from fetch
      // with credentials; Referer is enough to block arbitrary cross-site posts.
      const referer = request.headers.get("referer");
      if (!referer) return site === null || site === "none";
      return new URL(referer).origin === new URL(request.url).origin;
    }
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const bookMail =
    request.headers.get(BOOK_MAIL_HEADER) === "1" && sameOrigin(request);
  const session = await getSession();
  if (!session && !bookMail) {
    return NextResponse.json(
      { error: "Session has expired. Sign in again to send mail." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const to = asList(body.to);
  const subject = typeof body.subject === "string" ? body.subject : "";
  const text =
    typeof body.text === "string"
      ? body.text
      : typeof body.body === "string"
        ? body.body
        : "";
  const html = typeof body.html === "string" ? body.html : undefined;
  const attachments = Array.isArray(body.attachments)
    ? (body.attachments as AttachmentIn[])
        .filter((row) => row?.content && row?.filename)
        .map((row) => ({
          filename: String(row.filename),
          type: row.type,
          content: String(row.content),
          disposition: row.disposition,
          contentId: row.contentId,
        }))
    : undefined;

  try {
    await sendViaSendGrid({
      to,
      subject,
      text,
      html,
      cc: asList(body.cc),
      bcc: asList(body.bcc),
      attachments,
    });
    return NextResponse.json({ ok: true, delivered: "sendgrid" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send email";
    const status = /not configured/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
