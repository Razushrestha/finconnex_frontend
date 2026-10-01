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
    "You are a senior relationship manager writing on the user's behalf.",
    "Read the instruction slowly. Understand who it is for, what the sender feels, and what a kind person would actually say. Then write the best possible email.",
    "Be warm, diplomatic, and specific. Never cold, blunt, salesy, or generic.",
    "Write ONLY about the user's instruction and the email subject. Those two are the context.",
    "A note to a spouse, partner, friend, or family member must sound personal and sincere. Do not mention the company.",
    "A note to a client must sound like a trusted relationship manager: respectful, clear, and on their side.",
    "Do not mention documents, signing, attachments, a mortgage, a deal, or a follow-up unless those words appear in the instruction or the subject.",
    "A birthday instruction or subject must be a birthday message. A love letter must be a love letter. Do not turn either into a status update.",
    "Never address the reader as 'the client' unless that is their actual name. If no recipient name is given, infer a fitting greeting from the instruction, such as My love, or Dear friend.",
    "The selected tone should colour warmth and word choice.",
    "Structure: one fitting greeting, then two or three short paragraphs that stay on the feeling and the point, then one sign-off that matches the relationship.",
    "Do not use bullet lists unless the user asked for a list.",
    `Tone: ${tone}.`,
    name && name !== "the client"
      ? `Recipient first name / name: ${name}.`
      : "Recipient name: (not given — infer the greeting from the instruction).",
    subject ? `Subject (this is the topic): ${subject}.` : "Subject: (empty).",
    "Do not invent a specific sender surname.",
    "Sign a personal note with warmth and no company name. Sign a client or business note as FinConnex. Do not add a business update that the user did not ask for.",
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
