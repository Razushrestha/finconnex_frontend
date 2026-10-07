/**
 * Client invite for a document request. Portal layout (header, document
 * cards, button, backup link) in the workspace brand colour.
 */

import {
  emailBrandFromValues,
  emailFillStyle,
  readClientEmailBrand,
  type EmailBrand,
} from "@/lib/emails/brand-mail";

const ORG = "FinconneX";
const INK = "#111827";
const MUTED = "#4B5563";
const LINE = "#E5E7EB";

export type InviteDocument = {
  title: string;
  description?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteDocuments(
  documents: Array<string | { title?: string; description?: string } | null | undefined>,
): InviteDocument[] {
  return documents
    .map((item) => {
      if (typeof item === "string") return { title: item.trim() };
      if (!item || typeof item !== "object") return { title: "" };
      return {
        title: item.title?.trim() ?? "",
        description: item.description?.trim() || undefined,
      };
    })
    .filter((item) => item.title);
}

export function documentRequestInviteCopy(input: {
  clientName: string;
  brokerName: string;
  title: string;
  documents: Array<string | InviteDocument>;
  provideUrl: string;
  dueDate?: string;
  notes?: string;
  brand?: EmailBrand;
}): { subject: string; html: string; text: string } {
  const brand = input.brand ?? emailBrandFromValues(null);
  const fill = emailFillStyle(brand);
  const accent = brand.primary;
  const client = input.clientName.trim() || "there";
  const broker = input.brokerName.trim() || "your broker";
  const docs = inviteDocuments(input.documents);
  const subject = `Documents requested: ${input.title.trim() || "Please provide these files"}`;
  const title = input.title.trim() || "your application";
  const due = input.dueDate?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const count = docs.length;
  const listText = docs.length
    ? docs
        .map((doc, index) => {
          const extra = doc.description ? ` — ${doc.description}` : "";
          return `  ${index + 1}. ${doc.title}${extra}`;
        })
        .join("\n")
    : "  (see the link for the full list)";
  const dueText = due ? `\nPlease provide these by ${due}.\n` : "";
  const notesText = notes ? `\nNote from ${broker}:\n${notes}\n` : "";
  const cards = docs.length
    ? docs
        .map(
          (doc) => `<div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;margin:0 0 10px;">
  <div style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(doc.title)}</div>
  ${doc.description ? `<div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">${escapeHtml(doc.description)}</div>` : ""}
</div>`,
        )
        .join("")
    : `<div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;color:${MUTED};">Open the link to see what is needed.</div>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${INK};max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="${fill}color:#ffffff;padding:22px 24px;">
    <div style="font-size:11px;letter-spacing:1.4px;font-weight:700;opacity:0.85;">FINCONNEX</div>
    <div style="margin-top:6px;font-size:26px;font-weight:800;line-height:1.2;">${escapeHtml(broker)}</div>
  </div>
  <div style="padding:22px 24px 8px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Hi ${escapeHtml(client)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;"><strong>${escapeHtml(broker)}</strong> has requested documents for your <strong>${escapeHtml(title)}</strong> application.</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:${MUTED};">A total of <strong style="color:${INK};">${count}</strong> document${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been requested from you. Please access your secure portal to review the requirements and upload your files.${due ? `<br/><br/>Please provide these by <strong style="color:${INK};">${escapeHtml(due)}</strong>.` : ""}</p>
    <div style="margin:0 0 10px;font-size:12px;letter-spacing:1.2px;font-weight:700;color:${accent};">DOCUMENTS REQUESTED</div>
    ${cards}
    ${notes ? `<p style="margin:8px 0 16px;font-size:14px;line-height:1.5;color:${MUTED};">${escapeHtml(notes)}</p>` : ""}
    <p style="margin:16px 0;font-size:14px;line-height:1.55;color:${MUTED};">Use the button to open your secure document portal. This link is unique to you and should not be shared with anyone.</p>
    <p style="margin:0 0 18px;"><a href="${escapeHtml(input.provideUrl)}" style="display:inline-block;${fill}color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;padding:14px 18px;">Open secure document portal</a></p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED};">If the button does not work, copy and paste this URL into your browser:</p>
    <div style="border:1px solid ${LINE};border-radius:8px;padding:12px 14px;font-size:12px;line-height:1.5;color:${accent};word-break:break-all;">${escapeHtml(input.provideUrl)}</div>
    <div style="margin-top:16px;border:1px solid ${LINE};border-radius:10px;padding:14px 16px;">
      <div style="font-size:11px;letter-spacing:1.2px;font-weight:700;color:${accent};">QUESTIONS</div>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${MUTED};">If you have any questions, contact your assigned consultant directly.</p>
    </div>
    <p style="margin:22px 0 8px;font-size:15px;line-height:1.5;">Regards,<br/><strong>${escapeHtml(ORG)}</strong></p>
  </div>
</div>`;

  const text = `Hi ${client},

${broker} has requested documents for your ${title} application.

A total of ${count} document${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been requested from you.

${listText}
${dueText}${notesText}
Open your secure document portal: ${input.provideUrl}

If you have any questions, contact your assigned consultant directly.

Regards,
${ORG}
`;

  return { subject, html, text };
}

export async function sendDocumentRequestInviteEmail(input: {
  to: string;
  clientName: string;
  brokerName: string;
  title: string;
  documents: Array<string | InviteDocument>;
  provideUrl: string;
  dueDate?: string;
  notes?: string;
  contactId?: string;
  brand?: EmailBrand;
}): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Invite email can only be sent from the browser");
  }
  const email = input.to.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("A valid client email is required to send the request");
  }
  const brand = input.brand ?? readClientEmailBrand();
  const copy = documentRequestInviteCopy({ ...input, brand });
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
      brokerName: input.brokerName,
      title: input.title,
      documents: input.documents,
      provideUrl: input.provideUrl,
      dueDate: input.dueDate,
      notes: input.notes,
      brand,
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
