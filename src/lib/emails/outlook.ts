import type { Email } from "@/lib/emails/types";
import {
  contactAddress,
  contactName,
  flagsFor,
  isOurAddress,
  isOutbound,
  type MailboxFlags,
} from "@/lib/emails/mailbox";

export type FocusView = "all" | "focused" | "other";

const OTHER_HINTS =
  /social|promotion|promo|newsletter|unsubscribe|sale|offer|% off|linkedin|facebook|instagram|twitter|marketing|digest|roundup|webinar invite|flash deal/i;

export function classifyFocus(email: Email, flags?: MailboxFlags): Exclude<FocusView, "all"> {
  const stored = flags ?? flagsFor(email.id, email);
  if (stored.focusOverride) return stored.focusOverride;
  const hay = `${email.subject} ${email.body} ${email.from} ${email.templateUsed ?? ""}`;
  if (OTHER_HINTS.test(hay)) return "other";
  const labels = stored.labels ?? [];
  if (labels.includes("Friends") && !labels.includes("Work")) return "other";
  return "focused";
}

export function sortMailboxRows(emails: Email[]) {
  return [...emails].sort((a, b) => {
    const ap = flagsFor(a.id, a).pinned ? 1 : 0;
    const bp = flagsFor(b.id, b).pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return 0;
  });
}

export interface MailInsight {
  urgency: "high" | "medium" | "low";
  action: string;
  reason: string;
  category: string;
}

export function insightFor(email: Email): MailInsight {
  const hay = `${email.subject} ${email.body}`.toLowerCase();
  if (classifyFocus(email) === "other") {
    return {
      urgency: "low",
      action: "Review later",
      reason: "Looks like social or promotional mail.",
      category: "Other",
    };
  }
  if (hay.includes("rate lock") || hay.includes("friday") || hay.includes("outstanding")) {
    return {
      urgency: "high",
      action: "Reply today",
      reason: "Time-sensitive loan or document item.",
      category: "Priority",
    };
  }
  if (hay.includes("meeting") || hay.includes("tomorrow") || hay.includes("call")) {
    return {
      urgency: "medium",
      action: "Add a meeting",
      reason: "A meeting or call is mentioned.",
      category: "Calendar",
    };
  }
  if (hay.includes("proposal") || hay.includes("follow")) {
    return {
      urgency: "medium",
      action: "Follow up",
      reason: "Proposal or follow-up still open.",
      category: "Pipeline",
    };
  }
  if (hay.includes("document") || hay.includes("payslip")) {
    return {
      urgency: "high",
      action: "Check documents",
      reason: "Client documents are in play.",
      category: "Documents",
    };
  }
  return {
    urgency: "low",
    action: "Read when ready",
    reason: "No urgent cue detected.",
    category: "General",
  };
}

export function summariseEmail(email: Email) {
  const who = contactName(email);
  const insight = insightFor(email);
  const snippet = email.body.replace(/\s+/g, " ").trim().slice(0, 120);
  return `${who} is writing about “${email.subject || "this email"}”. ${insight.reason} ${snippet}${snippet.length >= 120 ? "…" : ""} Suggested next step: ${insight.action}.`;
}

export const COPILOT_PROMPTS = [
  "Top 5 most important emails today",
  "What needs a reply",
  "Summarize my inbox",
  "Emails that mention a meeting",
] as const;

export interface CopilotHit {
  id: string;
  title: string;
  detail: string;
}

export interface CopilotAnswer {
  prompt: string;
  summary: string;
  hits: CopilotHit[];
}

function scoreImportance(email: Email) {
  const insight = insightFor(email);
  const flags = flagsFor(email.id, email);
  let score = 0;
  if (insight.urgency === "high") score += 5;
  if (insight.urgency === "medium") score += 3;
  if (flags.important || flags.pinned) score += 4;
  if (email.status !== "Opened") score += 2;
  if (!isOutbound(email)) score += 1;
  return score;
}

export function runMailCopilot(prompt: string, emails: Email[]): CopilotAnswer {
  const q = prompt.trim().toLowerCase();
  const inbox = emails.filter(
    (email) =>
      email.status !== "Draft" &&
      email.status !== "Scheduled" &&
      !flagsFor(email.id, email).trash &&
      !flagsFor(email.id, email).spam,
  );

  function hitsFrom(list: Email[], limit = 5): CopilotHit[] {
    return list.slice(0, limit).map((email) => {
      const insight = insightFor(email);
      return {
        id: email.id,
        title: `${contactName(email)} — ${email.subject || "(no subject)"}`,
        detail: insight.action,
      };
    });
  }

  if (/important|top\s*5|priority/.test(q)) {
    const ranked = [...inbox].sort((a, b) => scoreImportance(b) - scoreImportance(a));
    return {
      prompt,
      summary: "Here are the most important emails to look at first.",
      hits: hitsFrom(ranked, 5),
    };
  }
  if (/reply|respond|unread/.test(q)) {
    const needs = inbox.filter(
      (email) => !isOutbound(email) && email.status !== "Opened",
    );
    return {
      prompt,
      summary:
        needs.length === 0
          ? "Nothing is waiting on a reply."
          : `${needs.length} email${needs.length === 1 ? "" : "s"} still need a reply.`,
      hits: hitsFrom(needs),
    };
  }
  if (/meeting|calendar|call/.test(q)) {
    const meetings = inbox.filter((email) => insightFor(email).category === "Calendar");
    return {
      prompt,
      summary:
        meetings.length === 0
          ? "No meeting mentions in the current mailbox."
          : `${meetings.length} email${meetings.length === 1 ? "" : "s"} mention a meeting or call.`,
      hits: hitsFrom(meetings),
    };
  }
  if (/summar|overview|inbox/.test(q)) {
    const unread = inbox.filter((email) => email.status !== "Opened").length;
    const replies = inbox.filter(
      (email) => !isOutbound(email) && email.status !== "Opened",
    ).length;
    const flagged = inbox.filter((email) => flagsFor(email.id, email).important).length;
    return {
      prompt,
      summary: `Inbox snapshot: ${inbox.length} active emails, ${unread} unread, ${replies} waiting on a reply, ${flagged} flagged.`,
      hits: hitsFrom(
        [...inbox].sort((a, b) => scoreImportance(b) - scoreImportance(a)),
        4,
      ),
    };
  }

  const matched = inbox.filter((email) =>
    `${contactName(email)} ${email.subject} ${email.body}`.toLowerCase().includes(q),
  );
  return {
    prompt,
    summary:
      matched.length === 0
        ? "I couldn't match that prompt. Try one of the ready prompts."
        : `Found ${matched.length} email${matched.length === 1 ? "" : "s"} for “${prompt.trim()}”.`,
    hits: hitsFrom(matched),
  };
}

export function inboxInsights(emails: Email[]) {
  const insights = emails.map((email) => ({ email, insight: insightFor(email) }));
  return {
    needsReply: emails.filter(
      (email) => !isOutbound(email) && email.status !== "Opened" && email.status !== "Draft",
    ).length,
    flagged: emails.filter((email) => flagsFor(email.id, email).important).length,
    pinned: emails.filter((email) => flagsFor(email.id, email).pinned).length,
    meetings: insights.filter((item) => item.insight.category === "Calendar").length,
    high: insights.filter((item) => item.insight.urgency === "high").length,
    top: insights.find((item) => item.insight.urgency === "high") ?? insights[0] ?? null,
  };
}

export type ComposeMode = "reply" | "replyAll" | "forward" | "forwardAttach";

export interface ComposeDraft {
  mode: ComposeMode;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  relatedName?: string;
  templateUsed?: string;
}

const COMPOSE_KEY = "finconnex.email.compose.v1";

function quoted(email: Email) {
  const who = contactName(email);
  const when = email.sentDate ?? "";
  const body = email.body.replace(/<[^>]+>/g, " ").trim();
  return `\n\n---------- Original message ----------\nFrom: ${who} <${email.from}>\nDate: ${when}\nSubject: ${email.subject}\n\n${body}`;
}

function withPrefix(subject: string, prefix: "Re:" | "Fwd:") {
  const trimmed = subject.trim();
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed;
  return `${prefix} ${trimmed || "(no subject)"}`;
}

export function draftFromEmail(email: Email, mode: ComposeMode): ComposeDraft {
  const counterpart = contactAddress(email) ?? email.from;
  const ours = [email.from, ...email.to, ...(email.cc ?? [])].filter((item) =>
    isOurAddress(item),
  );
  const relatedName = contactName(email);

  if (mode === "reply") {
    return {
      mode,
      to: [isOutbound(email) ? email.to[0] ?? counterpart : email.from],
      subject: withPrefix(email.subject, "Re:"),
      body: quoted(email),
      relatedName,
    };
  }
  if (mode === "replyAll") {
    const to = isOutbound(email)
      ? [...email.to]
      : [email.from, ...email.to.filter((item) => !isOurAddress(item))];
    const cc = (email.cc ?? []).filter((item) => !to.includes(item) && !ours.includes(item));
    return {
      mode,
      to: [...new Set(to.filter(Boolean))],
      cc,
      subject: withPrefix(email.subject, "Re:"),
      body: quoted(email),
      relatedName,
    };
  }
  if (mode === "forwardAttach") {
    return {
      mode,
      to: [],
      subject: withPrefix(email.subject, "Fwd:"),
      body: `Please see the attached original message: ${email.subject || "email"}.eml`,
      relatedName,
      templateUsed: email.subject || "Original email",
    };
  }
  return {
    mode,
    to: [],
    subject: withPrefix(email.subject, "Fwd:"),
    body: quoted(email),
    relatedName,
  };
}

export function stashCompose(draft: ComposeDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(COMPOSE_KEY, JSON.stringify(draft));
}

export function takeCompose(): ComposeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COMPOSE_KEY);
    sessionStorage.removeItem(COMPOSE_KEY);
    return raw ? (JSON.parse(raw) as ComposeDraft) : null;
  } catch {
    return null;
  }
}

export function meetingHref(email: Email) {
  const params = new URLSearchParams();
  params.set("title", email.subject || "Follow-up meeting");
  params.set("relatedName", contactName(email));
  const address = contactAddress(email);
  if (address) params.set("email", address);
  return `/activities/meetings/create?${params}`;
}
