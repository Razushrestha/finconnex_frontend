import type { InboxConversation, InboxMessage } from "@/lib/marketing/inbox/types";

function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || name || "there";
}

export function lastInboundMessage(
  conversation: InboxConversation,
): InboxMessage | null {
  return [...conversation.messages].reverse().find((m) => !m.outbound) ?? null;
}

function lastInboundText(conversation: InboxConversation) {
  const last = lastInboundMessage(conversation);
  return (last?.body ?? conversation.lastMessage).trim();
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function snippet(text: string, max = 42) {
  const clean = compact(text).replace(/^["“]+|["”]+$/g, "");
  if (clean.length <= max) return clean.replace(/[.?!…]+$/, "");
  return `${clean.slice(0, max - 1).trim()}…`;
}

function hasAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

type SuggestIntent =
  | "first-home"
  | "rate-lock"
  | "rates"
  | "commercial"
  | "docs-received"
  | "docs-needed"
  | "proposal"
  | "call"
  | "available"
  | "thanks"
  | "pre-approval"
  | "question"
  | "general";

function detectIntent(body: string): SuggestIntent {
  const text = body.toLowerCase();
  if (hasAny(text, ["first-home", "first home", "fhb", "first home buyer"])) {
    return "first-home";
  }
  if (hasAny(text, ["lock the rate", "rate lock", "lock this", "lock the"])) {
    return "rate-lock";
  }
  if (hasAny(text, ["rate", "interest", "comparison rate"])) return "rates";
  if (hasAny(text, ["commercial", "business loan", "investment property"])) {
    return "commercial";
  }
  if (
    hasAny(text, ["docs uploaded", "documents uploaded", "uploaded"]) ||
    (hasAny(text, ["docs", "documents"]) && hasAny(text, ["thanks", "done", "sent"]))
  ) {
    return "docs-received";
  }
  if (hasAny(text, ["upload", "payslip", "id proof", "documents", "docs"])) {
    return "docs-needed";
  }
  if (hasAny(text, ["proposal", "reviewing", "quote", "pack"])) return "proposal";
  if (hasAny(text, ["pre-approval", "preapproval", "pre approval"])) {
    return "pre-approval";
  }
  if (hasAny(text, ["call", "phone", "ring"])) return "call";
  if (hasAny(text, ["available", "anyone there", "chat", "hello", "hi!"])) {
    return "available";
  }
  if (hasAny(text, ["thanks", "thank you", "cheers"])) return "thanks";
  if (
    text.includes("?") ||
    /^(do|does|can|could|would|will|is|are|what|when|where|how|who)\b/.test(text)
  ) {
    return "question";
  }
  return "general";
}

function repliesForIntent(
  intent: SuggestIntent,
  first: string,
  last: string,
): string[] {
  const about = snippet(last);
  switch (intent) {
    case "first-home":
      return [
        `Yes ${first}, we specialise in first-home buyer loans. Want current rates?`,
        `We do. I can send our first-home buyer guide and the docs you'll need.`,
        `Yes — first-home buyers are a core part of what we do. Free for a quick call today?`,
      ];
    case "rate-lock":
      return [
        `Hi ${first}, I can look at locking that rate this week. Are you free for a quick call today?`,
        `Yes, we can lock the rate if the numbers still work. I'll check today's pricing now.`,
        `Happy to help lock this. Do you want me to hold it for 14 or 30 days?`,
      ];
    case "rates":
      return [
        `Hi ${first}, I can share today's rates for your situation. Owner-occupier or investment?`,
        `Yes — I'll pull current rates and a comparison. What's the loan size you're looking at?`,
        `Happy to go through rates. A 10-minute call is usually fastest — when works?`,
      ];
    case "commercial":
      return [
        `Hi ${first}, happy to help with commercial lending. What's the property and loan amount?`,
        `Yes, we do commercial. A broker can call you to go through options — best time today?`,
        `We can look at this. Is it for a purchase, refinance, or working capital?`,
      ];
    case "docs-received":
      return [
        `Thanks ${first}, I've got the documents. I'll review them and come back shortly.`,
        `Received — thank you. I'll check they're complete and let you know if anything's missing.`,
        `Thanks for uploading those. I'll update your file now and share next steps today.`,
      ];
    case "docs-needed":
      return [
        `Hi ${first}, I can send the document list now so you know exactly what to upload.`,
        `Happy to help. ID, latest payslips, and a rates notice usually get us started.`,
        `I'll request the outstanding docs on your file. Can you upload them today?`,
      ];
    case "proposal":
      return [
        `Thanks ${first}, no rush. I'm here when you've reviewed and happy to jump on a call.`,
        `Take your time with the proposal. Want me to highlight the key numbers?`,
        `When you've read through it, tell me what you'd like to change and I'll revise it.`,
      ];
    case "call":
      return [
        `Yes ${first}, I can arrange a call. What time works today?`,
        `Happy to call. Morning or afternoon, and which number is best?`,
        `I'll set a callback. Is this number still the best one to reach you?`,
      ];
    case "available":
      return [
        `Hi ${first}, I'm here. How can I help you today?`,
        `Yes, I'm available. Are you looking at a home loan, refinance, or something else?`,
        `I'm online now — tell me what you need and I'll point you in the right direction.`,
      ];
    case "thanks":
      return [
        `You're welcome ${first}. I'll keep this moving and update you shortly.`,
        `Glad that helped. Anything else you need from me right now?`,
        `Thanks ${first}. I'll follow up as soon as I have the next update.`,
      ];
    case "pre-approval":
      return [
        `Hi ${first}, we can start a pre-approval. Have you got ID and latest payslips handy?`,
        `Yes — pre-approval is the right next step. What's the purchase price you're targeting?`,
        `I can get pre-approval moving today. Are you buying with someone else?`,
      ];
    case "question":
      return [
        `Yes ${first}, I can help with that — I'll confirm the details on "${about}" and reply shortly.`,
        `Good question. I'll check this and come back with a clear next step.`,
        `Happy to answer that. Want a quick written summary, or is a call easier?`,
      ];
    default:
      return [
        `Hi ${first}, thanks for your message about “${about}”. I'll look into this and come back shortly.`,
        `Got it — I can help with that. Want me to send next steps now?`,
        `Thanks ${first}. A quick call is often fastest here. When works for you?`,
      ];
  }
}

/** Three reply chips tailored to the client's last inbound message. */
export function inboxAiSuggestedReplies(
  conversation: InboxConversation,
): string[] {
  const last = lastInboundText(conversation);
  if (!last) return [];
  const first = firstNameOf(conversation.contactName);
  const intent = detectIntent(last);
  const unique = [...new Set(repliesForIntent(intent, first, last))];
  return unique.slice(0, 3);
}

export function inboxAiSuggest(conversation: InboxConversation) {
  return (
    inboxAiSuggestedReplies(conversation)[0] ??
    `Hi ${firstNameOf(conversation.contactName)}, thanks for your message. I'll look into this and get back to you shortly.`
  );
}
