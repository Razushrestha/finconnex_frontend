import "server-only";

type DeliverInput = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    type?: string;
    content: string;
    disposition?: "attachment" | "inline";
    contentId?: string;
  }>;
};

function addresses(list?: string[]) {
  const seen = new Set<string>();
  const out: Array<{ email: string }> = [];
  for (const item of list ?? []) {
    const email = item.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({ email: item.trim() });
  }
  return out;
}

/** SendGrid wants raw base64, no data: prefix or whitespace. */
export function sendgridBase64(content: string): string {
  const trimmed = content.trim();
  const dataUrl = trimmed.match(/^data:[^;]+;base64,(.+)$/is);
  const raw = dataUrl?.[1] ?? trimmed;
  return raw.replace(/\s+/g, "");
}

export function sendgridConfigured() {
  const key = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const from = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "";
  return Boolean(key && from.includes("@"));
}

function mapAttachments(input: DeliverInput["attachments"]) {
  return (input ?? [])
    .filter((row) => row.content && row.filename)
    .map((row) => {
      const content = sendgridBase64(row.content);
      const contentId = row.contentId?.trim();
      const inline = row.disposition === "inline" && Boolean(contentId);
      const item: Record<string, string> = {
        content,
        filename: row.filename.replace(/[/\\]/g, "-").slice(0, 200) || "file",
        type: row.type?.trim() || "application/octet-stream",
        disposition: inline ? "inline" : "attachment",
      };
      if (inline && contentId) item.content_id = contentId;
      return item;
    })
    .filter((row) => row.content.length > 0);
}

export async function sendViaSendGrid(input: DeliverInput): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "";
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "FinConnex";
  const to = addresses(input.to);
  if (!apiKey || !fromEmail.includes("@")) {
    throw new Error(
      "SendGrid is not configured on this app. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in .env.local.",
    );
  }
  if (!to[0]) {
    throw new Error("Add a recipient email address");
  }
  const subject = input.subject.trim();
  const text = input.text.trim() || subject;
  if (!subject) {
    throw new Error("Subject is required");
  }

  const used = new Set(to.map((row) => row.email.toLowerCase()));
  const cc = addresses(input.cc).filter((row) => {
    const key = row.email.toLowerCase();
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
  const bcc = addresses(input.bcc).filter((row) => {
    const key = row.email.toLowerCase();
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });

  const personalization: Record<string, unknown> = { to };
  if (cc.length) personalization.cc = cc;
  if (bcc.length) personalization.bcc = bcc;

  const content: Array<{ type: string; value: string }> = [
    { type: "text/plain", value: text },
  ];
  const html = input.html?.trim();
  if (html) content.push({ type: "text/html", value: html });

  const attachments = mapAttachments(input.attachments);
  const payload: Record<string, unknown> = {
    personalizations: [personalization],
    from: { email: fromEmail, name: fromName },
    subject,
    content,
  };
  if (attachments.length) payload.attachments = attachments;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 202 || res.status === 200) return;

  let detail = `SendGrid rejected the message (${res.status})`;
  try {
    const json = (await res.json()) as {
      errors?: Array<{ message?: string; field?: string }>;
    };
    const parts = (json.errors ?? [])
      .map((item) => {
        const msg = item.message?.trim();
        if (!msg) return "";
        return item.field ? `${item.field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) detail = parts.join(" ");
  } catch {
    /* keep */
  }

  if (res.status === 401 || /authorization|api key/i.test(detail)) {
    throw new Error(
      "SendGrid API key was rejected. Create a new Mail Send key and set SENDGRID_API_KEY in .env.local, then restart npm run dev.",
    );
  }
  if (/verified|sender identity|from address/i.test(detail)) {
    throw new Error(
      "SendGrid will not send until SENDGRID_FROM_EMAIL is a verified Single Sender or authenticated domain in the SendGrid dashboard.",
    );
  }
  throw new Error(detail);
}
