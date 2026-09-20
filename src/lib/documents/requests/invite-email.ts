/**
 * Client invite for a document request — lists what to provide and a link
 * to upload. Sent through FinConnex SendGrid so it works on Vercel.
 */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function documentRequestInviteCopy(input: {
  clientName: string;
  brokerName: string;
  title: string;
  documents: string[];
  provideUrl: string;
  dueDate?: string;
  notes?: string;
}): { subject: string; html: string; text: string } {
  const first = input.clientName.trim().split(/\s+/)[0] || "there";
  const broker = input.brokerName.trim() || "your broker";
  const docs = input.documents.map((d) => d.trim()).filter(Boolean);
  const subject = `Documents requested: ${input.title.trim() || "Please provide these files"}`;

  const listHtml = docs.length
    ? `<ol style="font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px">${docs
        .map((d) => `<li>${escapeHtml(d)}</li>`)
        .join("")}</ol>`
    : `<p style="font-size:14px;margin:0 0 16px">Please open the link below to see what is needed.</p>`;

  const listText = docs.length
    ? docs.map((d, i) => `  ${i + 1}. ${d}`).join("\n")
    : "  (see the link for the full list)";

  const dueHtml = input.dueDate?.trim()
    ? `<p style="font-size:14px;line-height:1.55;margin:0 0 12px">Please provide these by <strong>${escapeHtml(input.dueDate.trim())}</strong>.</p>`
    : "";
  const dueText = input.dueDate?.trim()
    ? `\nPlease provide these by ${input.dueDate.trim()}.\n`
    : "";

  const notesHtml = input.notes?.trim()
    ? `<p style="font-size:14px;line-height:1.55;margin:0 0 16px;color:#334155">${escapeHtml(input.notes.trim())}</p>`
    : "";
  const notesText = input.notes?.trim()
    ? `\nNote from ${broker}:\n${input.notes.trim()}\n`
    : "";

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px 0">
<p style="font-size:16px;margin:0 0 12px">Hi ${escapeHtml(first)},</p>
<p style="font-size:14px;line-height:1.55;margin:0 0 12px"><strong>${escapeHtml(broker)}</strong> has asked you to provide the following document${docs.length === 1 ? "" : "s"} for <strong>${escapeHtml(input.title.trim() || "your application")}</strong>:</p>
${listHtml}
${dueHtml}
${notesHtml}
<p style="margin:0 0 8px"><a href="${escapeHtml(input.provideUrl)}" style="display:inline-block;background:#5A32A3;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600">Upload documents</a></p>
<p style="font-size:12px;color:#64748b;margin:12px 0 0">${escapeHtml(input.provideUrl)}</p>
</div>`;

  const text = `Hi ${first},

${broker} has asked you to provide the following document${docs.length === 1 ? "" : "s"} for ${input.title.trim() || "your application"}:

${listText}
${dueText}${notesText}
Upload here: ${input.provideUrl}
`;

  return { subject, html, text };
}

export async function sendDocumentRequestInviteEmail(input: {
  to: string;
  clientName: string;
  brokerName: string;
  title: string;
  documents: string[];
  provideUrl: string;
  dueDate?: string;
  notes?: string;
}): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Invite email can only be sent from the browser");
  }
  const email = input.to.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("A valid client email is required to send the request");
  }
  const copy = documentRequestInviteCopy(input);
  const res = await fetch("/api/auth/mail/deliver", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: [email],
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      json.error ||
        (res.status === 503
          ? "Email sending is not configured. Set SendGrid on this server, then retry."
          : "Could not email the client this document request."),
    );
  }
}
