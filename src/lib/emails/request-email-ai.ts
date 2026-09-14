import {
  draftEmailFromPrompt,
  editEmailWithPrompt,
  extractEmailCore,
  htmlToPlainText,
  plainTextToEmailHtml,
  rewriteEmailWithAi,
  subjectsGroundedInDraft,
  suggestSubjects,
  type EmailAiAction,
  type EmailTone,
  type SubjectSuggestion,
} from "@/lib/emails/ai-compose";

export type EmailAiRequest = {
  mode: "draft" | "rewrite" | "edit" | "subjects";
  prompt?: string;
  html?: string;
  tone?: EmailTone;
  action?: EmailAiAction;
  recipientName?: string;
  subject?: string;
  dealTitle?: string;
  dealStage?: string;
};

function localFallback(input: EmailAiRequest) {
  if (input.mode === "draft") {
    return draftEmailFromPrompt({
      prompt: input.prompt ?? "",
      tone: input.tone,
      recipientName: input.recipientName,
      subject: input.subject,
    });
  }
  if (input.mode === "edit") {
    return editEmailWithPrompt({
      html: input.html ?? "",
      prompt: input.prompt ?? "",
      recipientName: input.recipientName,
      subject: input.subject,
    });
  }
  return rewriteEmailWithAi({
    html: input.html ?? "",
    tone: input.tone ?? "professional",
    action: input.action,
    recipientName: input.recipientName,
    subject: input.subject,
  });
}

export async function requestEmailAi(input: EmailAiRequest): Promise<string> {
  const rewriteHtml =
    input.mode === "rewrite" && input.html
      ? plainTextToEmailHtml(extractEmailCore(htmlToPlainText(input.html)) || htmlToPlainText(input.html))
      : input.html;
  const payload: EmailAiRequest = { ...input, html: rewriteHtml };
  const res = await fetch("/api/ai/email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as {
    html?: string;
    error?: string;
  };
  if (res.status === 503 || res.status === 502) {
    return localFallback(payload);
  }
  if (!res.ok) {
    throw new Error(json.error || "Google AI could not write this email.");
  }
  if (json.html?.trim()) return json.html;
  throw new Error("Google AI returned an empty draft.");
}

export async function requestEmailSubjects(
  input: Omit<EmailAiRequest, "mode">,
): Promise<SubjectSuggestion[]> {
  const bodyText = htmlToPlainText(input.html ?? "");
  const source = `${input.subject ?? ""} ${bodyText}`;
  const fallback = suggestSubjects({
    current: input.subject,
    recipientName: input.recipientName,
    body: bodyText,
    prompt: input.prompt,
  });
  const res = await fetch("/api/ai/email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "subjects",
      subject: input.subject,
      html: input.html,
      prompt: input.prompt,
      recipientName: input.recipientName,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    subjects?: SubjectSuggestion[];
    error?: string;
  };
  if (res.status === 503 || res.status === 502) return fallback;
  if (!res.ok) {
    throw new Error(json.error || "Google AI could not suggest subjects.");
  }
  const rows = Array.isArray(json.subjects)
    ? json.subjects.filter((row) => row?.text?.trim())
    : [];
  const grounded = subjectsGroundedInDraft(rows, source);
  return grounded.length ? grounded : fallback;
}
