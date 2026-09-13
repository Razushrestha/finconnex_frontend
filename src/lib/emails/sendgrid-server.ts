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
  return (list ?? [])
    .map((item) => item.trim())
    .filter((item) => item.includes("@"))
    .map((email) => ({ email }));
}

export function sendgridConfigured() {
  const key = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const from = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "";
  return Boolean(key && from.includes("@"));
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

  const personalization: Record<string, unknown> = { to };
  const cc = addresses(input.cc);
  const bcc = addresses(input.bcc);
  if (cc.length) personalization.cc = cc;
  if (bcc.length) personalization.bcc = bcc;

  const content: Array<{ type: string; value: string }> = [
    { type: "text/plain", value: text },
  ];
  const html = input.html?.trim();
  if (html) content.push({ type: "text/html", value: html });

  const attachments = (input.attachments ?? [])
    .filter((row) => row.content && row.filename)
    .map((row) => {
      const item: Record<string, string> = {
        content: row.content,
        filename: row.filename,
        type: row.type || "application/octet-stream",
        disposition: row.disposition || "attachment",
      };
      if (row.contentId) item.content_id = row.contentId;
      return item;
    });

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
      errors?: Array<{ message?: string }>;
    };
    const first = json.errors?.[0]?.message?.trim();
    if (first) detail = first;
  } catch {
    /* keep */
  }
  throw new Error(detail);
}
