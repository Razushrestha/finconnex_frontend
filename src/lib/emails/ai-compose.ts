export const EMAIL_TONES = [
  { id: "friendly", label: "Friendly", hint: "Warm, full, and clear" },
  { id: "professional", label: "Professional", hint: "Detailed and polished" },
  { id: "emotional", label: "Emotional", hint: "Heartfelt and complete" },
  { id: "loving", label: "Loving", hint: "Caring, close, and thorough" },
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

function looksLikeInstruction(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (
    /keep the same recipient|current draft:|apply this instruction/i.test(value)
  ) {
    return true;
  }
  return /^(please\s+)?(write|draft|compose|create|make|generate|rewrite|send)\b/i.test(
    value,
  );
}

/** Drop leaked composer instructions so they never appear in the sent body. */
export function stripInstructionLeak(text: string) {
  return text
    .replace(/keep the same recipient and purpose\.?/gi, " ")
    .replace(/apply this instruction:\s*/gi, " ")
    .replace(/current draft:\s*/gi, " ")
    .replace(
      /^(please\s+)?(write|draft|compose|create|make|generate)\s+(me\s+)?(a|an|the)?\s*(quick\s+|short\s+|detailed\s+|professional\s+)?(email|message)\s+(for|about)?\s*/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function substanceFromPrompt(input: {
  prompt: string;
  existing?: string;
  subject?: string;
}) {
  const prompt = input.prompt.trim();
  const existing = stripInstructionLeak(extractEmailCore(input.existing ?? ""));
  const cleaned = stripInstructionLeak(prompt);
  const hay = `${prompt} ${cleaned}`.toLowerCase();
  const topic = topicFromDraft(input.subject, existing);
  const about =
    topic && topic !== "our conversation" ? topic.replace(/[.?!]+$/g, "") : "";

  if (/\bfollow[\s-]?up\b/.test(hay)) {
    if (/\bdocument/.test(hay) || /\boutstanding/.test(hay)) {
      return about
        ? `I am following up on ${about}, specifically the documents still outstanding. Could you please send through whatever remains so we can keep the file moving without a further delay?\n\nIf those papers are already on the way, a short confirmation would help. If something is blocking you, tell me what you need and I will help.`
        : `I am following up on the documents we still need from you. Please send through anything outstanding, or let me know if you are waiting on something from our side.\n\nA short reply is enough for us to update the file and take the next step.`;
    }
    if (/\b(call|meeting|book|20-minute)\b/.test(hay)) {
      return `I am following up to book a short call so we can confirm next steps together. Twenty minutes should be enough if you have the file to hand.\n\nPlease reply with a couple of times that suit you this week, and I will send a calendar invite.`;
    }
    return about
      ? `I am following up regarding ${about}. I wanted to check whether you have had a chance to review this, and whether anything is still needed from you or from us before we continue.\n\nIf you have already actioned it, thank you. If not, a brief update on where things stand would help us keep the matter moving in an orderly way.`
      : `I am following up to make sure this has not stalled, and that you have everything you need from FinConnex.\n\nWhen you have a moment, please let me know if you are happy for us to continue, or if there is a question I should answer first.`;
  }

  if (cleaned && !looksLikeInstruction(cleaned) && cleaned.split(/\s+/).length >= 6) {
    return cleaned.endsWith(".") || cleaned.endsWith("?") || cleaned.endsWith("!")
      ? cleaned
      : `${cleaned}.`;
  }

  if (existing && !looksLikeInstruction(existing) && existing.split(/\s+/).length >= 6) {
    return existing;
  }

  return "I wanted to follow up and keep this moving. Please let me know the best next step from your side.";
}

function firstName(recipient?: string) {
  const raw = recipient?.trim();
  if (!raw) return "there";
  if (raw.includes("@")) return raw.split("@")[0] ?? "there";
  return raw.split(/\s+/)[0] ?? "there";
}

const TONE_OPENERS: Record<EmailTone, string> = {
  friendly:
    "I hope you are well. I wanted to write a proper note rather than a rushed line, so you have a clear and complete picture of where things stand.",
  professional:
    "I am writing to provide a clear, considered update and to place the relevant details in one message. The aim is to be accurate, thorough, and straightforward to act on.",
  emotional:
    "I wanted to reach out with genuine care, because this is more than a routine status note. I hope the explanation below gives you both clarity and reassurance about what has taken place.",
  loving:
    "I wanted to send a thoughtful, carefully written note so you feel looked after as well as informed. You have been very much in mind as we have brought this together.",
  formal:
    "Please accept this correspondence as a complete update for your records. The points below are set out so the position, the documents, and the requested next step are each easy to identify.",
  empathetic:
    "I recognise this may ask for your time and attention, and I have written with that in mind. My intention is to explain the position fully so you do not have to piece it together yourself.",
  persuasive:
    "I wanted to set out a complete picture of the opportunity and the work already done, so the value of moving forward is easy to see. A clear next step is included at the close of this note.",
  confident:
    "We are in a strong position to progress this, and I wanted to document that with the right level of detail. The summary below covers what is complete, what is attached, and how I recommend we proceed.",
  grateful:
    "Thank you for your time and trust; it is genuinely appreciated. I wanted to write a full note so you can see exactly how that trust has been used and what is now ready for you.",
  urgent:
    "This is time-sensitive, and I have therefore written a complete briefing rather than a short alert. Please read the three points of context, substance, and action below so nothing material is missed.",
  warm:
    "I wanted to stay in touch with a human, considered note rather than a thin update. The detail below is here so you feel supported and fully informed.",
  executive:
    "Please find a structured briefing below. I have kept the language professional while still covering context, substance, and the decision I need from you.",
};

const TONE_CLOSERS: Record<EmailTone, string> = {
  friendly:
    "Whenever you have a moment, please look through the details and any attachments and tell me if something does not line up. I am happy to talk it through and will make the next step as easy as I can.",
  professional:
    "Please review the information and any attachments at your convenience. I would welcome your confirmation, comments, or further instruction so we can proceed in an orderly and documented way.",
  emotional:
    "Please take the time you need to sit with this. If anything feels uncertain or incomplete, I am here, and I would be grateful to hear from you once you have had a chance to read it through.",
  loving:
    "Please know I am here if you would like anything explained more gently or in more detail. When you are ready, a short reply will help me keep supporting you with whatever comes next.",
  formal:
    "I should be grateful if you would review the enclosed position and respond with any observations or confirmation at your earliest convenience. I remain available should further particulars be required.",
  empathetic:
    "There is no expectation that you reply immediately if now is a difficult moment. When you are ready, I will gladly walk through any part of this with you and adjust the next step to what you can manage.",
  persuasive:
    "If this reads as the right course, I recommend we confirm the next step this week so momentum is not lost. Please reply with a preferred time, or with any concern I should address before we proceed.",
  confident:
    "I am ready to close this out cleanly once I have your go-ahead. Please confirm how you would like to proceed, and I will action it without delay.",
  grateful:
    "Thank you again for the confidence you have placed in this process. Please let me know if I can do anything further, and I will treat your reply with the same care.",
  urgent:
    "A prompt reply today would help us protect the timeline. Please confirm you have received this, reviewed the attachments, and can take the next step, or tell me immediately if something is blocking you.",
  warm:
    "I hope this leaves you feeling well briefed rather than hurried. Reply when you can, and I will take care of the follow-through from there.",
  executive:
    "Please confirm the decision or the change you want applied. I will then execute and report back with a short close-out note.",
};

const TONE_DEVELOP: Record<EmailTone, string> = {
  friendly:
    "I have spelled this out so you are not left guessing about the purpose of the email, the documents involved, and whether signing is complete or still under way. I would rather send a complete note than a thin one-liner you have to decode.",
  professional:
    "I have expanded the point so the purpose, the documents concerned, and the current signing status are each stated in plain terms. Please treat this as the working record until we agree any correction.",
  emotional:
    "I wanted the substance to be as clear as the feeling behind it: what these documents are, that they are signed or being signed, and why that matters for you. Nothing important should be left between the lines.",
  loving:
    "I have taken care to name the documents and the signing position so you can see, in one place, that things have been handled with attention. I want you to feel both close to the process and confident in the outcome.",
  formal:
    "The following restates the instruction in fuller terms, including the documents in view and the present status of execution, so the file is complete.",
  empathetic:
    "I have added the practical detail — the documents, the signing position, and what I am asking of you — so you can respond without having to chase missing context.",
  persuasive:
    "In more concrete terms, the documents are in hand, signing is the milestone we are confirming, and a timely response will let us lock in the benefit of the work already done.",
  confident:
    "To be specific: the relevant documents are identified below in spirit if not by every filename, signing is the status I am confirming, and I am ready to complete the remaining administration as soon as you reply.",
  grateful:
    "In practical terms, this note confirms the documents in play and the signing position, and it invites you to tell me if any further thanks or follow-up would help.",
  urgent:
    "Concretely, the documents and the signing status need your eyes now, because delay at this point creates avoidable risk. Please treat the attachments and the request in this email as the full brief.",
  warm:
    "I have included the fuller story — what we are sending, that signing is the heart of it, and how you can come back to me — so the message feels complete rather than abrupt.",
  executive:
    "Substance: documents in scope, signing status, and the decision or acknowledgement required. Please treat anything omitted as not material unless you tell me otherwise.",
};

const GREETING_LINE =
  /^(hi|hello|hey|dear)\b[\s\S]{0,80}$/i;
const EXEC_GREETING_LINE = /^[\w .'-]{1,60}\s+—$/;
const SIGNOFF_LINE =
  /^(kind regards|yours sincerely|yours faithfully|warm regards|best regards|best wishes|regards|talk soon|with care|warmly|with thanks|please reply today|cheers|thanks|thank you)[,\s]*$/i;
const SENDER_LINE = /^(finconnex|kind regards,?\s*finconnex)$/i;

function isGreetingLine(line: string) {
  const value = line.trim();
  if (!value) return false;
  if (GREETING_LINE.test(value.replace(/,$/, ""))) return true;
  return EXEC_GREETING_LINE.test(value);
}

function isOpenerLine(line: string) {
  const value = line.trim();
  return Object.values(TONE_OPENERS).some(
    (opener) => value === opener || value.startsWith(opener.slice(0, 28)),
  );
}

function isSignoffLine(line: string) {
  const value = line.trim().replace(/,$/, "");
  if (!value) return true;
  return SIGNOFF_LINE.test(value) || SENDER_LINE.test(value);
}

function isCloserLine(line: string) {
  const value = line.trim();
  if (!value) return false;
  return Object.values(TONE_CLOSERS).some(
    (closer) => value === closer || value.startsWith(closer.slice(0, 32)),
  );
}

/** Peel stacked greetings / openers / sign-offs so a tone change rewrites the core once. */
export function extractEmailCore(text: string) {
  let next = text.replace(/\u200b/g, "").trim();
  let prev = "";
  while (next && next !== prev) {
    prev = next;
    const lines = next.split(/\n/).map((line) => line.trimEnd());
    while (lines.length && !lines[0]!.trim()) lines.shift();
    while (lines.length && isGreetingLine(lines[0]!)) lines.shift();
    while (lines.length && !lines[0]!.trim()) lines.shift();
    while (lines.length && isOpenerLine(lines[0]!)) lines.shift();
    while (lines.length && !lines[0]!.trim()) lines.shift();
    while (lines.length && isSignoffLine(lines[lines.length - 1]!)) lines.pop();
    while (lines.length && isCloserLine(lines[lines.length - 1]!)) lines.pop();
    while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
    next = lines.join("\n").trim();
  }
  return next;
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

function developMiddle(core: string, tone: EmailTone) {
  const cleaned = stripInstructionLeak(core).replace(/\s+/g, " ").trim();
  if (!cleaned || looksLikeInstruction(cleaned)) {
    return substanceFromPrompt({ prompt: core || "follow up" });
  }
  if (cleaned.includes("\n")) return cleaned;
  const sentence =
    cleaned.endsWith(".") || cleaned.endsWith("?") || cleaned.endsWith("!")
      ? cleaned
      : `${cleaned}.`;
  const words = sentence.split(/\s+/).filter(Boolean).length;
  if (words >= 24) return sentence;
  return `${sentence} ${TONE_DEVELOP[tone]}`;
}

function wrapTone(body: string, tone: EmailTone, name: string) {
  const core =
    extractEmailCore(body) ||
    "I wanted to follow up on our conversation and keep things moving.";
  const middle = developMiddle(core, tone);
  return `${greeting(tone, name)}\n\n${TONE_OPENERS[tone]}\n\n${middle}\n\n${TONE_CLOSERS[tone]}\n\n${signoff(tone)}`;
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

export function topicFromDraft(subject?: string, body?: string) {
  const sub = (subject ?? "")
    .replace(/^(re:|fw:|fwd:)\s*/i, "")
    .trim();
  if (sub) {
    const leadIn = sub.match(
      /^(check|review|see|look at|regarding|about|update on|following up on)\s+(.+)/i,
    );
    if (leadIn?.[2]) return leadIn[2].replace(/[.?!]+$/, "").trim();
    return sub.replace(/[.?!]+$/, "");
  }
  const first = extractEmailCore(body ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find((part) => part.length > 8);
  if (!first) return "our conversation";
  return first.length > 70 ? `${first.slice(0, 67).trim()}…` : first;
}

const UNRELATED_DEAL_NOISE =
  /\b(home loan|pre-approval|preapproval|refinance|investment loan)\b/i;

export function subjectsGroundedInDraft(
  rows: SubjectSuggestion[],
  source: string,
): SubjectSuggestion[] {
  const hay = source.toLowerCase();
  const allowNoise = UNRELATED_DEAL_NOISE.test(hay);
  return rows.filter((row) => {
    const text = row.text.trim();
    if (!text) return false;
    if (!allowNoise && UNRELATED_DEAL_NOISE.test(text)) return false;
    return true;
  });
}

export function suggestSubjects(input: {
  current?: string;
  recipientName?: string;
  dealTitle?: string;
  dealStage?: string;
  prompt?: string;
  body?: string;
}): SubjectSuggestion[] {
  const current = input.current?.trim() ?? "";
  const body = input.body?.trim() || input.prompt?.trim() || "";
  const topic = topicFromDraft(current, body);
  const titled = topic.charAt(0).toUpperCase() + topic.slice(1);
  const reviewed = current.replace(/^check\b/i, "Review");
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const row of [
    current,
    reviewed !== current ? reviewed : "",
    `Following up on ${topic}`,
    titled,
    `Quick note about ${topic}`,
  ]) {
    const text = row.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
    if (unique.length === 4) break;
  }
  const source = `${current} ${body}`;
  const grounded = subjectsGroundedInDraft(
    unique.map((text, index) => ({
      text,
      recommended: index === (current ? 1 : 0) || (unique.length === 1 && index === 0),
      reason:
        index === 0 && current
          ? "Keeps your current subject"
          : "Phrased from the subject and body",
    })),
    source,
  );
  if (!grounded.some((row) => row.recommended) && grounded[0]) {
    grounded[0] = {
      ...grounded[0],
      recommended: true,
      reason: grounded[0].reason || "Closest to the draft",
    };
  }
  return grounded;
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
  const core = asksDocs
    ? `Could you please send through ${input.context!.documentsOutstanding!.join(" and ")} so we can keep your application moving?`
    : substanceFromPrompt({
        prompt,
        subject: input.subject,
      });
  const seed = [core, crm].filter(Boolean).join(" ");
  const full = lengthen(wrapTone(seed, tone, name), input.length ?? "medium");
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
  const existing = extractEmailCore(htmlToPlainText(input.html));
  const subjectHint = input.subject?.trim();
  const seed = fromVoice
    ? substanceFromPrompt({
        prompt: fromVoice,
        existing,
        subject: subjectHint,
      })
    : existing && !looksLikeInstruction(existing)
      ? existing
      : substanceFromPrompt({
          prompt: subjectHint || "follow up",
          existing,
          subject: subjectHint,
        });

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
  const core = extractEmailCore(existing);
  if (!core || looksLikeInstruction(core) || core.split(/\s+/).length < 6) {
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
    voiceNotes: prompt,
  });
}

export function emailHasDraftContent(html: string) {
  const text = htmlToPlainText(html)
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 8;
}
