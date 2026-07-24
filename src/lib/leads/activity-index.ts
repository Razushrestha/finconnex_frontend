/**
 * Build per-lead activity candidates from live/seed activity sources.
 * Matching is by Lead related-to name (and call contact / message from).
 */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import {
  parseFlexibleDate,
  startOfDay,
} from "@/lib/leads/activity-dates";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";
import { resolveUnrepliedThresholdMs } from "@/lib/leads/lead-card-settings";
import { listMeetings } from "@/lib/meetings/store";
import { listMessages } from "@/lib/messages/store";
import { listNotes } from "@/lib/notes/store";
import { listAttachments } from "@/lib/attachments/store";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { reminders } from "@/lib/reminders/types";
import { extrasToCandidates } from "@/lib/leads/lead-extras-store";
import { statusHistoryToCandidates } from "@/lib/leads/lead-status-history";
import { listTaskColumns } from "@/lib/tasks/store";

const OPEN_TASK = new Set(["Not Started", "In Progress", "Deferred"]);
const OPEN_CALL = new Set(["Scheduled", "No Answer", "Voicemail Left"]);
const OPEN_MEETING = new Set(["Scheduled", "In Progress", "Rescheduled"]);
const OPEN_REMINDER = new Set(["Pending", "Snoozed"]);

const OWNER_SET = new Set(
  ACTIVITY_OWNERS.map((o) => o.toLowerCase()),
);

function namesEqual(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Parse "Lead: Name" / RelatedTo / bare name → lead name if kind is Lead. */
export function leadNameFromRelated(
  related?: string | { kind: string; name: string } | null,
): string | null {
  if (!related) return null;
  if (typeof related === "object") {
    return related.kind === "Lead" ? related.name : null;
  }
  const m = related.match(/^Lead:\s*(.+)$/i);
  if (m) return m[1].trim();
  return null;
}

export function relatedMatchesLead(
  related: string | { kind: string; name: string } | undefined,
  leadName: string,
): boolean {
  const name = leadNameFromRelated(related);
  return !!name && namesEqual(name, leadName);
}

function classifySchedule(
  dueAt: Date | null,
  now: Date,
): "broken" | "scheduled" {
  if (!dueAt) return "scheduled";
  return dueAt.getTime() < now.getTime() ? "broken" : "scheduled";
}

function isReceivedToday(at: Date, now: Date) {
  return startOfDay(at).getTime() === startOfDay(now).getTime();
}

function isOwnerName(name: string) {
  return OWNER_SET.has(name.trim().toLowerCase());
}

function fromTasks(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const col of listTaskColumns()) {
    for (const t of col.tasks) {
      if (!relatedMatchesLead(t.relatedTo, leadName)) continue;
      const dueAt = parseFlexibleDate(t.dueDate);
      const createdAt = parseFlexibleDate(t.reminderDate) ?? dueAt;

      if (t.status === "Completed") {
        out.push({
          id: t.taskId,
          kind: "task",
          title: t.title,
          dueAt: parseFlexibleDate(t.completedDate) ?? dueAt,
          createdAt,
          bucket: "completed",
          sourceModule: "tasks",
        });
        continue;
      }

      if (!OPEN_TASK.has(t.status)) continue;

      out.push({
        id: t.taskId,
        kind: "task",
        title: t.title,
        dueAt,
        createdAt,
        bucket: classifySchedule(dueAt, now),
        sourceModule: "tasks",
      });
    }
  }
  return out;
}

function fromCalls(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const c of listCalls()) {
    // Only Lead-scoped calls. Do not attach Contact:/Deal: rows just because
    // the contact display name matches a lead (e.g. Priya Nair).
    const match =
      relatedMatchesLead(c.relatedTo, leadName) ||
      (!c.relatedTo && !!c.contact && namesEqual(c.contact, leadName));
    if (!match) continue;

    const dueAt = parseFlexibleDate(c.date);
    const createdAt = dueAt;
    const missed =
      c.callType === "Missed" ||
      c.status === "No Answer" ||
      c.status === "Voicemail Left";

    if (c.status === "Completed") {
      out.push({
        id: c.id,
        kind: "call",
        title: c.subject,
        dueAt,
        createdAt,
        bucket: "completed",
        sourceModule: "calls",
      });
      continue;
    }

    if (c.status === "Cancelled") continue;
    if (!OPEN_CALL.has(c.status) && !missed) continue;

    if (missed) {
      out.push({
        id: c.id,
        kind: "call",
        title: c.subject,
        dueAt,
        createdAt,
        bucket: "broken",
        isMissed: true,
        sourceModule: "calls",
      });
      continue;
    }

    // Scheduled (and still open)
    out.push({
      id: c.id,
      kind: "call",
      title: c.subject,
      dueAt,
      createdAt,
      bucket: classifySchedule(dueAt, now),
      sourceModule: "calls",
    });
  }
  return out;
}

function fromMeetings(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const m of listMeetings()) {
    if (!relatedMatchesLead(m.relatedTo, leadName)) continue;
    const dueAt = parseFlexibleDate(m.startDateTime);
    const createdAt = dueAt;

    if (m.status === "Completed") {
      out.push({
        id: m.id,
        kind: "meeting",
        title: m.title,
        dueAt: parseFlexibleDate(m.endDateTime) ?? dueAt,
        createdAt,
        bucket: "completed",
        sourceModule: "meetings",
      });
      continue;
    }

    if (m.status === "Cancelled") continue;
    if (!OPEN_MEETING.has(m.status)) continue;

    out.push({
      id: m.id,
      kind: "meeting",
      title: m.title,
      dueAt,
      createdAt,
      bucket: classifySchedule(dueAt, now),
      sourceModule: "meetings",
    });
  }
  return out;
}

function fromReminders(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const r of reminders) {
    if (!relatedMatchesLead(r.relatedTo, leadName)) continue;
    const dueAt = parseFlexibleDate(r.dateTime);
    if (!OPEN_REMINDER.has(r.status)) continue;

    out.push({
      id: r.id,
      kind: "reminder",
      title: r.title,
      dueAt,
      createdAt: dueAt,
      bucket: classifySchedule(dueAt, now),
      sourceModule: "reminders",
    });
  }
  return out;
}

/**
 * SMS: inbound from the lead (or related Lead) that still needs a reply
 * counts as pending; outbound Sent/Delivered/Read counts as completed.
 */
function fromMessages(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const msg of listMessages()) {
    const relatedLead = leadNameFromRelated(msg.relatedTo);
    const fromLead = namesEqual(msg.from, leadName);
    const toLead = namesEqual(msg.to, leadName);
    const isLeadScoped =
      (!!relatedLead && namesEqual(relatedLead, leadName)) ||
      fromLead ||
      toLead;
    if (!isLeadScoped) continue;

    const at = parseFlexibleDate(msg.sentDate);
    const inbound = fromLead || (relatedLead && !isOwnerName(msg.from));
    const outbound = toLead || isOwnerName(msg.from);

    if (msg.status === "Failed" || msg.status === "Draft") {
      // Drafts are not card competitors
      continue;
    }

    if (inbound && msg.type === "External") {
      const ageMs = at ? now.getTime() - at.getTime() : 0;
      const pastThreshold = ageMs >= resolveUnrepliedThresholdMs();
      const receivedToday = at ? isReceivedToday(at, now) : false;

      if (pastThreshold) {
        out.push({
          id: msg.id,
          kind: "sms",
          title: msg.subject,
          dueAt: at,
          createdAt: at,
          bucket: "broken",
          isUnreplied: true,
          sourceModule: "messages",
        });
      } else if (receivedToday || ageMs > 0) {
        // Within threshold — still competes as amber "received today" / pending
        out.push({
          id: msg.id,
          kind: "sms",
          title: msg.subject,
          dueAt: at,
          createdAt: at,
          bucket: "scheduled",
          isUnreplied: true,
          sourceModule: "messages",
        });
      }
      continue;
    }

    if (outbound && (msg.status === "Sent" || msg.status === "Delivered" || msg.status === "Read")) {
      out.push({
        id: msg.id,
        kind: "sms",
        title: msg.subject,
        dueAt: at,
        createdAt: at,
        bucket: "completed",
        sourceModule: "messages",
      });
    }
  }
  return out;
}

/** Unreplied inbound email past threshold; sent emails as completed. */
function fromEmails(leadName: string, now: Date): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const e of listEmails()) {
    const relatedLead = leadNameFromRelated(e.relatedTo);
    const relatedIsLead =
      !!relatedLead && namesEqual(relatedLead, leadName);
    const relatedBare =
      !!e.relatedTo &&
      !e.relatedTo.includes(":") &&
      namesEqual(e.relatedTo, leadName);
    if (!relatedIsLead && !relatedBare) continue;

    const at = parseFlexibleDate(e.sentDate ?? e.openedDate);
    // Owner-name from → outbound completed; otherwise treat as inbound unreplied.
    const outbound = isOwnerName(e.from);

    if (
      outbound &&
      (e.status === "Sent" ||
        e.status === "Delivered" ||
        e.status === "Opened")
    ) {
      out.push({
        id: e.id,
        kind: "email",
        title: e.subject,
        dueAt: at,
        createdAt: at,
        bucket: "completed",
        sourceModule: "emails",
      });
      continue;
    }

    if (!outbound && at && e.status !== "Draft" && e.status !== "Failed") {
      const ageMs = now.getTime() - at.getTime();
      out.push({
        id: e.id,
        kind: "email",
        title: e.subject,
        dueAt: at,
        createdAt: at,
        bucket:
          ageMs >= resolveUnrepliedThresholdMs() ? "broken" : "scheduled",
        isUnreplied: true,
        sourceModule: "emails",
      });
    }
  }
  return out;
}

function fromNotes(leadName: string): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const n of listNotes()) {
    if (!relatedMatchesLead(n.relatedTo, leadName)) continue;
    const at = parseFlexibleDate(n.createdAt);
    out.push({
      id: n.id,
      kind: "note",
      title: n.title,
      dueAt: at,
      createdAt: at,
      bucket: "completed",
      sourceModule: "notes",
    });
  }
  return out;
}

function fromAttachments(leadName: string): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const a of listAttachments()) {
    if (!relatedMatchesLead(a.relatedTo, leadName)) continue;
    const at = parseFlexibleDate(a.uploadedAt);
    out.push({
      id: a.id,
      kind: "attachment",
      title: a.fileName,
      dueAt: at,
      createdAt: at,
      bucket: "completed",
      sourceModule: "attachments",
    });
  }
  return out;
}

/** Spec §6 — Document requested (timeline event when a request is logged). */
function fromDocumentRequests(leadName: string): LeadActivityCandidate[] {
  const out: LeadActivityCandidate[] = [];
  for (const r of listDocumentRequests()) {
    if (!relatedMatchesLead(r.relatedTo, leadName)) continue;
    const at = parseFlexibleDate(r.requestedDate);
    out.push({
      id: r.id,
      kind: "document",
      title: r.title,
      dueAt: at,
      createdAt: at,
      bucket: "completed",
      sourceModule: "documents",
    });
  }
  return out;
}

/** All activity candidates for a lead (pending + completed). */
export function listLeadActivityCandidates(
  leadName: string,
  now = new Date(),
): LeadActivityCandidate[] {
  return [
    ...fromTasks(leadName, now),
    ...fromCalls(leadName, now),
    ...fromMeetings(leadName, now),
    ...fromReminders(leadName, now),
    ...fromMessages(leadName, now),
    ...fromEmails(leadName, now),
    ...fromNotes(leadName),
    ...fromAttachments(leadName),
    ...fromDocumentRequests(leadName),
    ...statusHistoryToCandidates(leadName),
    ...extrasToCandidates(leadName),
  ];
}

/** Deep-link into the matching activity module (Work Queue style). */
export function hrefForLeadActivity(c: LeadActivityCandidate): string | null {
  if (!c.sourceModule) return null;
  const base: Record<string, string> = {
    tasks: "/activities/tasks",
    calls: "/activities/calls",
    meetings: "/activities/meetings",
    emails: "/activities/emails",
    messages: "/activities/messages",
    reminders: "/activities/reminders",
    notes: "/activities/notes",
    attachments: "/activities/attachments",
    documents: "/documents/requests",
    leads: "/sales/leads",
  };
  const path = base[c.sourceModule];
  if (!path) return null;
  const params = new URLSearchParams();
  params.set("focus", c.id);
  params.set("q", c.title);
  return `${path}?${params.toString()}`;
}
