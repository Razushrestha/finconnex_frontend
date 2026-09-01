export const EMAIL_TONES = [
  { id: "friendly", label: "Friendly", hint: "Warm and easy" },
  { id: "professional", label: "Professional", hint: "Clear and polished" },
  { id: "emotional", label: "Emotional", hint: "Heartfelt" },
  { id: "loving", label: "Loving", hint: "Caring and close" },
  { id: "formal", label: "Formal", hint: "Traditional business" },
  { id: "empathetic", label: "Empathetic", hint: "Supportive" },
  { id: "persuasive", label: "Persuasive", hint: "Drive a next step" },
  { id: "confident", label: "Confident", hint: "Assured" },
  { id: "grateful", label: "Grateful", hint: "Thankful" },
  { id: "urgent", label: "Urgent", hint: "Time-sensitive" },
  { id: "warm", label: "Warm", hint: "Human and kind" },
  { id: "executive", label: "Executive", hint: "Advanced / concise" },
] as const;

export type EmailTone = (typeof EMAIL_TONES)[number]["id"];

export const EMAIL_AI_ACTIONS = [
  { id: "brief", label: "Optimize for brevity" },
  { id: "expand", label: "Make more detailed" },
  { id: "clarity", label: "Make clearer" },
  { id: "cta", label: "Add a call to action" },
  { id: "soften", label: "Soften the tone" },
  { id: "strengthen", label: "Make stronger" },
] as const;

export type EmailAiAction = (typeof EMAIL_AI_ACTIONS)[number]["id"];

export function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function plainTextToEmailHtml(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function firstName(recipient?: string) {
  const raw = recipient?.trim();
  if (!raw) return "there";
  if (raw.includes("@")) return raw.split("@")[0] ?? "there";
  return raw.split(/\s+/)[0] ?? "there";
}

function greeting(tone: EmailTone, name: string) {
  switch (tone) {
    case "friendly":
      return `Hi ${name},`;
    case "loving":
      return `Dear ${name},`;
    case "emotional":
      return `Dear ${name},`;
    case "formal":
      return `Dear ${name},`;
    case "executive":
      return `${name} —`;
    case "urgent":
      return `Hi ${name},`;
    default:
      return `Hello ${name},`;
  }
}

function signoff(tone: EmailTone) {
  switch (tone) {
    case "friendly":
      return "Talk soon,\nFinConnex";
    case "loving":
      return "With care,\nFinConnex";
    case "emotional":
      return "Warmly,\nFinConnex";
    case "grateful":
      return "With thanks,\nFinConnex";
    case "formal":
      return "Yours sincerely,\nFinConnex";
    case "executive":
      return "Regards,\nFinConnex";
    case "urgent":
      return "Please reply today,\nFinConnex";
    default:
      return "Kind regards,\nFinConnex";
  }
}

function wrapTone(body: string, tone: EmailTone, name: string) {
  const core = body.trim() || "I wanted to follow up on our conversation and keep things moving.";
  const openers: Record<EmailTone, string> = {
    friendly: "Hope you're having a good day — I wanted to share a quick note.",
    professional: "I am writing to follow up and keep this moving in a clear, timely way.",
    emotional: "I have been thinking about this and wanted to reach out with care.",
    loving: "I wanted to send a thoughtful note and make sure you feel supported.",
    formal: "Please find below an update for your consideration.",
    empathetic: "I understand this may take time and attention, and I am here to help.",
    persuasive: "There is a clear next step that I believe will serve you well.",
    confident: "We are in a strong position to progress this.",
    grateful: "Thank you for your time and trust — it is genuinely appreciated.",
    urgent: "This is time-sensitive and would benefit from a prompt response.",
    warm: "Just a warm note to stay connected and helpful.",
    executive: "Summary below. Decision requested.",
  };

  return `${greeting(tone, name)}\n\n${openers[tone]}\n\n${core}\n\n${signoff(tone)}`;
}

function applyAction(text: string, action: EmailAiAction) {
  const trimmed = text.trim();
  if (action === "brief") {
    const first = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
    return first.length > 280 ? `${first.slice(0, 277).trim()}…` : first;
  }
  if (action === "expand") {
    return `${trimmed}\n\nI have included a little more context so you have everything you need. If it would help, I can also share a short summary of options, timing, and what we would need from you next.`;
  }
  if (action === "clarity") {
    return trimmed
      .replace(/\s+/g, " ")
      .replace(/\bASAP\b/gi, "as soon as you can")
      .replace(/\bjust wanted to\b/gi, "I wanted to")
      .concat("\n\nIn short: here is what we need, why it matters, and the next step.");
  }
  if (action === "cta") {
    return `${trimmed}\n\nWould you be open to a brief call this week to confirm next steps? I can work around your calendar.`;
  }
  if (action === "soften") {
    return trimmed
      .replace(/\bneed you to\b/gi, "would appreciate if you could")
      .replace(/\bmust\b/gi, "should")
      .replace(/\basap\b/gi, "when you can")
      .concat("\n\nNo rush if now is not a good time — I am happy to adjust.");
  }
  return `${trimmed}\n\nI am confident we can close this out cleanly. Please let me know how you would like to proceed.`;
}

export type EmailLength = "short" | "medium" | "detailed";

export interface SubjectSuggestion {
  text: string;
  recommended?: boolean;
  reason?: string;
}

export interface ComposeAiContext {
  contactName?: string;
  tags?: string[];
  dealTitle?: string;
  dealStage?: string;
  documentsReceived?: string[];
  documentsOutstanding?: string[];
}

const COPILOT_TONES: EmailTone[] = ["professional", "friendly", "executive", "confident"];

export function copilotToneId(label: "professional" | "friendly" | "concise" | "confident"): EmailTone {
  if (label === "concise") return "executive";
  return label;
}

export function suggestSubjects(input: {
  current?: string;
  recipientName?: string;
  dealTitle?: string;
  dealStage?: string;
  prompt?: string;
}): SubjectSuggestion[] {
  const deal = input.dealTitle?.trim() || "your home loan";
  const current = input.current?.trim();
  const first = current || `${deal} – Next Steps`;
  const options = [
    first,
    `Your Home Loan Application – What's Next?`,
    `Next Steps for Your Home Loan Application`,
    `Your Pre-Approval Application Update`,
  ];
  const unique = [...new Set(options)].slice(0, 4);
  const recommended = unique.find((item) => item.toLowerCase().includes("next steps for")) ?? unique[0]!;
  return unique.map((text) => ({
    text,
    recommended: text === recommended,
    reason: text === recommended ? "Clearest next-step framing" : undefined,
  }));
}

function crmParagraph(ctx?: ComposeAiContext) {
  if (!ctx) return "";
  const bits: string[] = [];
  if (ctx.dealTitle && ctx.dealStage) {
    bits.push(`This relates to ${ctx.dealTitle}, currently at ${ctx.dealStage}.`);
  } else if (ctx.dealTitle) {
    bits.push(`This relates to ${ctx.dealTitle}.`);
  }
  if (ctx.documentsReceived?.length) {
    bits.push(`We already have ${ctx.documentsReceived.join(" and ")}.`);
  }
  if (ctx.documentsOutstanding?.length) {
    bits.push(`Still outstanding: ${ctx.documentsOutstanding.join("; ")}.`);
  }
  return bits.join(" ");
}

function lengthen(text: string, length: EmailLength) {
  if (length === "short") {
    const parts = text.split(/\n\n+/).filter(Boolean);
    if (parts.length <= 3) return text;
    return [parts[0], parts[1], parts[parts.length - 1]].join("\n\n");
  }
  if (length === "detailed") {
    return `${text}\n\nIf anything is unclear, reply to this email or book a time and I will walk you through it. I want you to feel confident about each step before we move forward.`;
  }
  return text;
}

export function draftEmailFromPrompt(input: {
  prompt: string;
  tone?: EmailTone;
  length?: EmailLength;
  recipientName?: string;
  subject?: string;
  context?: ComposeAiContext;
}) {
  const name = firstName(input.recipientName || input.context?.contactName);
  const tone = input.tone && COPILOT_TONES.includes(input.tone) ? input.tone : (input.tone ?? "professional");
  const prompt = input.prompt.trim();
  const crm = crmParagraph(input.context);
  const asksDocs =
    /document|payslip|outstanding|id|licence|license|bank statement/i.test(prompt) &&
    (input.context?.documentsOutstanding?.length ?? 0) > 0;
  const core =
    prompt ||
    (asksDocs
      ? `Could you please send through ${input.context!.documentsOutstanding!.join(" and ")} so we can keep your application moving?`
      : "I wanted to follow up and keep this moving.");
  const body = [core, crm].filter(Boolean).join("\n\n");
  const full = lengthen(`${greeting(tone, name)}\n\n${body}\n\n${signoff(tone)}`, input.length ?? "medium");
  return plainTextToEmailHtml(full);
}

export function rewriteEmailWithAi(input: {
  html: string;
  tone: EmailTone;
  action?: EmailAiAction;
  recipientName?: string;
  subject?: string;
  voiceNotes?: string;
}) {
  const name = firstName(input.recipientName);
  const fromVoice = input.voiceNotes?.trim();
  const existing = htmlToPlainText(input.html);
  const subjectHint = input.subject?.trim();
  const seed =
    fromVoice ||
    existing ||
    (subjectHint
      ? `This note is about “${subjectHint}”. I wanted to follow up and keep you updated.`
      : "I wanted to follow up and see how we can help next.");

  let next = wrapTone(seed, input.tone, name);
  if (input.action) next = wrapTone(applyAction(seed, input.action), input.tone, name);
  if (input.action === "brief") {
    next = `${greeting(input.tone, name)}\n\n${applyAction(seed, "brief")}\n\n${signoff(input.tone)}`;
  }
  if (input.action === "clarity") {
    next = `${greeting(input.tone, name)}\n\n${applyAction(seed, "clarity")}\n\n${signoff(input.tone)}`;
  }
  return plainTextToEmailHtml(next);
}

export function editEmailWithPrompt(input: {
  html: string;
  prompt: string;
  recipientName?: string;
  subject?: string;
}) {
  const prompt = input.prompt.trim();
  const existing = htmlToPlainText(input.html);
  if (!existing) {
    return draftEmailFromPrompt({
      prompt,
      recipientName: input.recipientName,
      subject: input.subject,
    });
  }
  return rewriteEmailWithAi({
    html: input.html,
    tone: "professional",
    recipientName: input.recipientName,
    subject: input.subject,
    voiceNotes: `${prompt}\n\nKeep the same recipient and purpose. Current draft:\n${existing}`,
  });
}

export function emailHasDraftContent(html: string) {
  const text = htmlToPlainText(html)
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 8;
}
