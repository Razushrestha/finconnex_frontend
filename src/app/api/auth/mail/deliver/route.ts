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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
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
