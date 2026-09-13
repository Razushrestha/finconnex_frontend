import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  type EmailAiAction,
  type EmailTone,
  htmlToPlainText,
  plainTextToEmailHtml,
} from "@/lib/emails/ai-compose";
import {
  generateGeminiText,
  isGeminiConfigured,
} from "@/lib/emails/gemini-server";

type Body = {
  mode?: "draft" | "rewrite" | "edit";
  prompt?: string;
  html?: string;
  tone?: EmailTone;
  action?: EmailAiAction;
  recipientName?: string;
  subject?: string;
};

function instruction(body: Body) {
  const tone = body.tone || "professional";
  const name = body.recipientName?.trim() || "the client";
  const subject = body.subject?.trim();
  const existing = htmlToPlainText(body.html ?? "");
  const prompt = body.prompt?.trim() || "";
  const action = body.action;

  const rules = [
    "Write a complete email body only. No subject line, no markdown fences, no commentary.",
    `Tone: ${tone}.`,
    `Recipient first name / name: ${name}.`,
    subject ? `Subject context: ${subject}.` : "",
    "Use a greeting and a short sign-off. Do not invent a specific sender surname.",
    "Keep it suitable for an Australian mortgage / finance CRM (FinConnex).",
  ]
    .filter(Boolean)
    .join("\n");

  if (body.mode === "draft" || (!existing && prompt)) {
    return `${rules}\n\nWrite the email described here:\n${prompt || "A professional follow-up."}`;
  }
  if (body.mode === "edit" || prompt) {
    return `${rules}\n\nCurrent draft:\n${existing || "(empty)"}\n\nApply this instruction:\n${prompt}`;
  }
  const actionHint =
    action === "brief"
      ? "Shorten it. Keep the same meaning. Aim for about half the length."
      : action === "clarity"
        ? "Rewrite for clarity. Short sentences. One clear next step."
        : action === "expand"
          ? "Add a little more helpful detail without becoming long-winded."
          : action === "cta"
            ? "Keep the draft and add a clear call to action."
            : `Rewrite in a ${tone} tone.`;
  return `${rules}\n\nCurrent draft:\n${existing || "(empty)"}\n\n${actionHint}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to use Write with AI." }, { status: 401 });
  }
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY in .env.local, then restart the app." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  try {
    const text = await generateGeminiText(instruction(body));
    return NextResponse.json({ html: plainTextToEmailHtml(text), text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google AI could not write this email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
