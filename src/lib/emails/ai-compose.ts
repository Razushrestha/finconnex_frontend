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
  return plainTextToEmailHtml(next);
}
