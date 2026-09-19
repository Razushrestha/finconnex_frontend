import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  type EmailAiAction,
  type EmailTone,
  draftEmailFromPrompt,
  editEmailWithPrompt,
  extractEmailCore,
  htmlToPlainText,
  plainTextToEmailHtml,
  rewriteEmailWithAi,
  stripInstructionLeak,
  suggestSubjects,
} from "@/lib/emails/ai-compose";
import {
  generateGeminiText,
  isGeminiConfigured,
} from "@/lib/emails/gemini-server";

type Body = {
  mode?: "draft" | "rewrite" | "edit" | "subjects";
  prompt?: string;
  html?: string;
  tone?: EmailTone;
  action?: EmailAiAction;
  recipientName?: string;
  subject?: string;
  dealTitle?: string;
  dealStage?: string;
};

function instruction(body: Body) {
  const tone = body.tone || "professional";
  const name = body.recipientName?.trim() || "the client";
  const subject = body.subject?.trim();
  const existing = extractEmailCore(htmlToPlainText(body.html ?? ""));
  const prompt = body.prompt?.trim() || "";
  const action = body.action;

  if (body.mode === "subjects") {
    return [
      "Return ONLY a JSON array of exactly 4 objects. No markdown fences, no commentary.",
      'Each object: {"text":"subject line","recommended":true|false,"reason":"short why"}.',
      "Exactly one item has recommended true.",
      "Ground every subject in the CURRENT SUBJECT and EMAIL BODY the user typed.",
      "Rephrase that topic. Do not switch to a different product, deal, or campaign.",
      "Do not mention a home loan, pre-approval, refinance, or deal name unless those words already appear in the current subject or body.",
      "Keep each subject under 80 characters. Do not use ALL CAPS.",
      `Recipient: ${name}.`,
      subject ? `Current subject: ${subject}.` : "Current subject: (empty).",
      existing
        ? `Email body:\n${existing.slice(0, 1200)}`
        : "Email body: (empty).",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const rules = [
    "Write a complete email body only. No subject line, no markdown fences, no commentary.",
    "The user's prompt is an INSTRUCTION to you. Never copy the prompt into the email.",
    "Never include phrases such as: write a email, write an email, Keep the same recipient, Current draft, Apply this instruction, or Current draft:.",
    "Replace the previous draft entirely. Do not quote it, do not append to it, and do not keep old greetings or sign-offs.",
    "If the user asked for a follow-up, write a real follow-up about the recipient and subject. Do not mention signing or documents unless the prompt or existing draft does.",
    "Always write in a polished, descriptive, professional register — even when the selected tone is friendly, emotional, or loving.",
    "The selected tone should colour warmth and word choice. It must not make the email short, casual-only, or one-line.",
    "Structure: exactly one greeting, then exactly three body paragraphs, then one sign-off.",
    "Each of the three body paragraphs must contain at least two complete sentences (aim for two to four).",
    "Paragraph 1: a considered opening that sets context in the chosen tone.",
    "Paragraph 2: the substance of what the user asked you to write — follow-up, documents, a meeting, etc.",
    "Paragraph 3: a courteous close with a clear next step, still in the chosen tone.",
    "Do not write a one-line or two-sentence email. Do not use bullet lists unless the user asked for a list.",
    `Tone: ${tone}.`,
    `Recipient first name / name: ${name}.`,
    subject ? `Subject context: ${subject}.` : "",
    "Use a greeting and a short sign-off. Do not invent a specific sender surname.",
    "Keep it suitable for an Australian mortgage / finance CRM (FinConnex).",
  ]
    .filter(Boolean)
    .join("\n");

  if (body.mode === "draft" || (!existing && prompt)) {
    return `${rules}\n\nWrite the email the user asked for. User instruction (do not copy this wording into the email):\n${prompt || "A professional follow-up."}`;
  }
  if (body.mode === "edit" || prompt) {
    return `${rules}\n\nExisting draft is context only — rewrite a fresh email, do not paste this block:\n${existing || "(empty)"}\n\nUser instruction (do not copy this wording into the email):\n${prompt}`;
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
            : `Rewrite the meaning of the current draft in a ${tone} tone. Return one complete replacement email.`;
  return `${rules}\n\nCurrent draft:\n${existing || "(empty)"}\n\n${actionHint}`;
}

function parseSubjectSuggestions(raw: string) {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const rec = row as Record<string, unknown>;
        const text = typeof rec.text === "string" ? rec.text.trim() : "";
        if (!text) return null;
        return {
          text,
          recommended: rec.recommended === true,
          reason: typeof rec.reason === "string" ? rec.reason.trim() : undefined,
        };
      })
      .filter((row) => row != null)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function localResult(body: Body) {
  if (body.mode === "subjects") {
    const bodyText = htmlToPlainText(body.html ?? "");
    return {
      subjects: suggestSubjects({
        current: body.subject,
        recipientName: body.recipientName,
        body: bodyText,
        prompt: body.prompt,
      }),
      text: "",
    };
  }
  const html =
    body.mode === "draft" || (!htmlToPlainText(body.html ?? "").trim() && body.prompt)
      ? draftEmailFromPrompt({
          prompt: body.prompt ?? "",
          tone: body.tone,
          recipientName: body.recipientName,
          subject: body.subject,
        })
      : body.mode === "edit" || body.prompt
        ? editEmailWithPrompt({
            html: body.html ?? "",
            prompt: body.prompt ?? "",
            recipientName: body.recipientName,
            subject: body.subject,
          })
        : rewriteEmailWithAi({
            html: body.html ?? "",
            tone: body.tone ?? "professional",
            action: body.action,
            recipientName: body.recipientName,
            subject: body.subject,
          });
  return { html, text: htmlToPlainText(html) };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to use Write with AI." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Body;
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(localResult(body));
    }
    const text = await generateGeminiText(instruction(body), {
      timeoutMs: 8_000,
      maxOutputTokens: 1400,
    });
    if (body.mode === "subjects") {
      const subjects = parseSubjectSuggestions(text);
      if (!subjects.length) {
        return NextResponse.json(localResult(body));
      }
      if (!subjects.some((row) => row.recommended)) {
        subjects[0] = {
          ...subjects[0]!,
          recommended: true,
          reason: subjects[0]!.reason || "Best match",
        };
      }
      return NextResponse.json({ subjects, text });
    }
    if (!text.trim()) {
      return NextResponse.json(localResult(body));
    }
    const cleaned = stripInstructionLeak(text);
    return NextResponse.json({
      html: plainTextToEmailHtml(cleaned || text),
      text: cleaned || text,
    });
  } catch {
    return NextResponse.json(localResult(body));
  }
}
