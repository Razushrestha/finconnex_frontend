/**
 * Welcome email for a newly provisioned workspace member.
 * Sent through FinConnex SendGrid so delivery works even when the CRM
 * invitation queue is down.
 */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function memberWelcomeEmailCopy(input: {
  fullName: string;
  email: string;
  password: string;
  loginUrl: string;
  workspaceName?: string;
}): { subject: string; html: string; text: string } {
  const workspace = (input.workspaceName || "FinConnex").trim() || "FinConnex";
  const first = input.fullName.trim().split(/\s+/)[0] || "there";
  const subject = `Your ${workspace} sign-in details`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px 0">
<p style="font-size:16px;margin:0 0 12px">Hi ${escapeHtml(first)},</p>
<p style="font-size:14px;line-height:1.55;margin:0 0 12px">You've been added to <strong>${escapeHtml(workspace)}</strong>. Use these details to sign in:</p>
<ul style="font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px">
  <li>Email: <strong>${escapeHtml(input.email)}</strong></li>
  <li>Temporary password: <strong>${escapeHtml(input.password)}</strong></li>
</ul>
<p style="font-size:14px;line-height:1.55;margin:0 0 16px">You'll be asked to choose your own password the first time you sign in.</p>
<p style="margin:0 0 8px"><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#5A32A3;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600">Sign in</a></p>
<p style="font-size:12px;color:#64748b;margin:12px 0 0">${escapeHtml(input.loginUrl)}</p>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0">Don't forward this message — it contains a temporary password.</p>
</div>`;
  const text = `Hi ${first},

You've been added to ${workspace}. Sign in with:

  Email:    ${input.email}
  Password: ${input.password}

You'll be asked to choose your own password the first time you sign in.

Sign in: ${input.loginUrl}

Don't forward this message — it contains a temporary password.`;
  return { subject, html, text };
}

export async function sendMemberWelcomeEmail(input: {
  to: string;
  fullName: string;
  password: string;
  workspaceName?: string;
  loginUrl?: string;
}): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Welcome email can only be sent from the browser");
  }
  const email = input.to.trim().toLowerCase();
  const password = input.password.trim();
  if (!email.includes("@") || password.length < 8) {
    throw new Error("A valid email and password are required to send sign-in details");
  }
  const loginUrl =
    input.loginUrl?.trim() || `${window.location.origin.replace(/\/$/, "")}/login`;
  const copy = memberWelcomeEmailCopy({
    fullName: input.fullName,
    email,
    password,
    loginUrl,
    workspaceName: input.workspaceName,
  });
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
          ? "Email is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, then retry."
          : "Could not send the sign-in email."),
    );
  }
}
