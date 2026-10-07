/**
 * Client invite for a document request. Same FinconneX card as appointment
 * emails, with the documents to provide and an Upload documents button.
 */

const ORG = "Finconnex Financial Services";
const PHONE = "02 1234 5678";
const EMAIL = "info@finconnex.com.au";
const SITE = "https://www.finconnex.com.au";
const NAVY = "#102A56";
const BLUE = "#1D6FE8";
const MUTED = "#5C6B82";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailRow(label: string, value: string, last = false) {
  return `<tr>
    <td style="padding:12px 16px;${last ? "" : "border-bottom:1px solid #e6eef8;"}width:120px;font-size:13px;color:${MUTED};vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:12px 16px;${last ? "" : "border-bottom:1px solid #e6eef8;"}font-size:14px;color:${NAVY};">${value}</td>
  </tr>`;
}

function contactCell(label: string, value: string, href: string) {
  return `<td style="padding:14px 8px 0;font-size:12px;line-height:1.45;color:${MUTED};">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.4px;color:${NAVY};">${escapeHtml(label)}</div>
    <a href="${escapeHtml(href)}" style="color:${BLUE};text-decoration:none;">${escapeHtml(value)}</a>
  </td>`;
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

  const title = input.title.trim() || "your application";
  const listHtml = docs.length
    ? `<ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:${NAVY};">${docs
        .map((d) => `<li>${escapeHtml(d)}</li>`)
        .join("")}</ol>`
    : `<span style="color:${MUTED};">Open the link to see what is needed.</span>`;
  const listText = docs.length
    ? docs.map((d, i) => `  ${i + 1}. ${d}`).join("\n")
    : "  (see the link for the full list)";
  const due = input.dueDate?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const dueText = due ? `\nPlease provide these by ${due}.\n` : "";
  const notesText = notes ? `\nNote from ${broker}:\n${notes}\n` : "";

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef3fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
      <tr><td style="padding:28px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:26px;font-weight:800;letter-spacing:-0.4px;color:${NAVY};">Finconne<span style="color:${BLUE};">X</span></div>
              <div style="font-size:10px;letter-spacing:1.6px;color:#7B8BA3;font-weight:700;">FINANCIAL SERVICES</div>
            </td>
            <td align="right" style="border-left:3px solid ${BLUE};padding-left:12px;font-size:13px;color:#7B8BA3;">Your trusted<br/>finance partner</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:12px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8ff;border-radius:18px;">
          <tr><td style="padding:28px 24px;">
            <div style="width:42px;height:42px;border-radius:21px;background:${BLUE};color:#ffffff;text-align:center;line-height:42px;font-size:20px;font-weight:700;">↑</div>
            <div style="font-size:28px;line-height:1.2;font-weight:800;margin-top:14px;color:${NAVY};">Please upload<br/>your documents</div>
            <p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:${MUTED};">Hi ${escapeHtml(first)},<br/><strong style="color:${NAVY};">${escapeHtml(broker)}</strong> has asked you to provide the document${docs.length === 1 ? "" : "s"} below for <strong style="color:${NAVY};">${escapeHtml(title)}</strong>.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:18px 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6eef8;border-radius:16px;">
          ${detailRow("Request", `<strong>${escapeHtml(title)}</strong>`)}
          ${detailRow("With", `<strong>${escapeHtml(broker)}</strong><br/><span style="color:${MUTED};font-weight:400;">${escapeHtml(ORG)}</span>`)}
          ${detailRow("Documents", listHtml, !due && !notes)}
          ${due ? detailRow("Due", `<strong>${escapeHtml(due)}</strong>`, !notes) : ""}
          ${notes ? detailRow("Note", escapeHtml(notes), true) : ""}
        </table>
      </td></tr>
      <tr><td style="padding:8px 24px 4px;">
        <a href="${escapeHtml(input.provideUrl)}" style="display:block;background:${BLUE};color:#ffffff;text-align:center;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;padding:14px 16px;">Upload documents</a>
      </td></tr>
      <tr><td style="padding:14px 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;border-radius:12px;">
          <tr><td style="padding:14px 16px;font-size:13px;line-height:1.5;color:${NAVY};">
            <strong>What happens next?</strong><br/>
            <span style="color:${MUTED};">Open the button above, choose a file for each document, then press Send. Your broker will see the files on the dashboard.</span>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;font-size:14px;line-height:1.6;color:${MUTED};">
        If you have any questions, feel free to reach out to us.<br/><br/>
        Regards,<br/>
        <strong style="color:${NAVY};">${ORG}</strong>
      </td></tr>
      <tr><td style="padding:8px 24px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6eef8;">
          <tr>
            ${contactCell("Call Us", PHONE, `tel:${PHONE.replace(/\s/g, "")}`)}
            ${contactCell("Email Us", EMAIL, `mailto:${EMAIL}`)}
            ${contactCell("Visit Us", "www.finconnex.com.au", SITE)}
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = `Hi ${first},

${broker} has asked you to provide the following document${docs.length === 1 ? "" : "s"} for ${title}:

${listText}
${dueText}${notesText}
Upload documents: ${input.provideUrl}

Regards,
${ORG}
${PHONE} · ${EMAIL} · www.finconnex.com.au
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
  contactId?: string;
}): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Invite email can only be sent from the browser");
  }
  const email = input.to.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("A valid client email is required to send the request");
  }
  const copy = documentRequestInviteCopy(input);
  const res = await fetch("/api/documents/provide/invite", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
      clientName: input.clientName,
    }),
  });
  if (res.ok) return;
  let message = "Could not email the client this document request.";
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error?.trim()) message = json.error.trim();
  } catch {
    /* keep the generic message */
  }
  throw new Error(message);
}
