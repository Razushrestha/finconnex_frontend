import { NextResponse } from "next/server";
import { openPublicProvideSession } from "@/lib/documents/requests/public-provide";
import { sendViaSendGrid } from "@/lib/emails/sendgrid-server";

type Ctx = { params: Promise<{ token: string }> };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Client uploads a requested document. Files are emailed to the broker who
 * created the request (SendGrid). No CRM session required — the sealed token
 * is the auth.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { token: raw } = await ctx.params;
  let token = raw?.trim() ?? "";
  try {
    token = decodeURIComponent(token);
  } catch {
    /* already decoded */
  }

  const session = openPublicProvideSession(token);
  if (!session) {
    return NextResponse.json(
      { error: "This upload link is invalid or has expired." },
      { status: 404 },
    );
  }

  if (!session.brokerEmail?.includes("@")) {
    return NextResponse.json(
      {
        error:
          "This request has no broker email on file. Ask your broker to resend the invite.",
      },
      { status: 422 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const itemId = String(form.get("itemId") ?? "").trim();
  const item =
    session.items.find((row) => row.id === itemId) ??
    session.items.find((row) => row.title === itemId) ??
    null;
  if (!item) {
    return NextResponse.json(
      { error: "Unknown document on this request." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File must be 12 MB or smaller." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = (file.name || `${item.title}.bin`).replace(/[^\w.\- ()]+/g, "_");
  const contentType = file.type || "application/octet-stream";

  const subject = `Document received: ${item.title} · ${session.title}`;
  const text = [
    `${session.clientName} (${session.clientEmail}) uploaded "${item.title}" for request "${session.title}".`,
    "",
    `Request id: ${session.requestId}`,
    `File: ${filename}`,
    "",
    "Open FinConnex → Documents → Requests to review.",
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
<p style="font-size:14px;line-height:1.55"><strong>${escapeHtml(session.clientName)}</strong> (${escapeHtml(session.clientEmail)}) uploaded <strong>${escapeHtml(item.title)}</strong> for <strong>${escapeHtml(session.title)}</strong>.</p>
<p style="font-size:13px;color:#64748b">Request id: ${escapeHtml(session.requestId)} · File: ${escapeHtml(filename)}</p>
</div>`;

  try {
    await sendViaSendGrid({
      to: [session.brokerEmail],
      subject,
      text,
      html,
      attachments: [
        {
          filename,
          type: contentType,
          content: bytes.toString("base64"),
          disposition: "attachment",
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not deliver the upload";
    const status = /not configured/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    ok: true,
    itemId: item.id,
    title: item.title,
    filename,
  });
}
