import {
  draftEmailFromPrompt,
  editEmailWithPrompt,
  rewriteEmailWithAi,
  type EmailAiAction,
  type EmailTone,
} from "@/lib/emails/ai-compose";

export type EmailAiRequest = {
  mode: "draft" | "rewrite" | "edit";
  prompt?: string;
  html?: string;
  tone?: EmailTone;
  action?: EmailAiAction;
  recipientName?: string;
  subject?: string;
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
  const res = await fetch("/api/ai/email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as {
    html?: string;
    error?: string;
  };
  if (res.status === 503) {
    return localFallback(input);
  }
  if (!res.ok) {
    throw new Error(json.error || "Google AI could not write this email.");
  }
  if (json.html?.trim()) return json.html;
  throw new Error("Google AI returned an empty draft.");
}
