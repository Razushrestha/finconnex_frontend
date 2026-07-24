/**
 * Lead Card Activity Summary ranking (spec §5) + Last Activity (spec §6).
 * Pure functions — no store I/O. Pass candidates + `now` for determinism.
 */

import {
  formatRelativeTime,
  formatSummaryDueLabel,
  startOfDay,
} from "@/lib/leads/activity-dates";
import type {
  ActivitySummarySelection,
  ActivityUrgency,
  LastActivitySelection,
  LeadActivityCandidate,
  LeadActivityKind,
} from "@/lib/leads/card-types";

/** Spec §5 tie-breaker kind order (lower wins). */
const KIND_RANK: Record<LeadActivityKind, number> = {
  call: 0,
  meeting: 1,
  task: 2,
  reminder: 3,
  sms: 4,
  email: 5,
  note: 6,
  attachment: 7,
  status_change: 8,
  stage_change: 9,
  document: 10,
  workflow: 11,
  other: 12,
};

function dayBucket(dueAt: Date | null, now: Date): number {
  if (!dueAt) return 3;
  const today = startOfDay(now).getTime();
  const day = startOfDay(dueAt).getTime();
  if (day < today) return 0; // overdue
  if (day === today) return 1; // today
  return 2; // future
}

/**
 * Urgency color for an Activity Summary candidate (spec §5 / §10).
 * Broken → red; due/received today → amber; future scheduled → green.
 */
export function urgencyForCandidate(
  c: LeadActivityCandidate,
  now = new Date(),
): ActivityUrgency {
  if (c.bucket === "broken") return "red";
  const bucket = dayBucket(c.dueAt, now);
  if (bucket <= 1) return "amber";
  return "green";
}

/**
 * Compare two pending competitors. Lower sort index = higher priority.
 * Broken always beats scheduled; within a class, sooner/more overdue first,
 * then spec tie-breakers when due timestamps match.
 */
export function compareActivityCandidates(
  a: LeadActivityCandidate,
  b: LeadActivityCandidate,
  now = new Date(),
): number {
  // 1. Broken always outranks scheduled
  if (a.bucket !== b.bucket) {
    if (a.bucket === "broken") return -1;
    if (b.bucket === "broken") return 1;
  }

  const aTime = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bTime = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;

  // 2a. Broken: oldest / most severe first (earliest due)
  // 2b. Scheduled: nearest due first
  if (aTime !== bTime) return aTime - bTime;

  // Tie-breakers when due date/time identical (spec §5)
  // 1. Overdue before Due Today (day bucket)
  const dayDiff = dayBucket(a.dueAt, now) - dayBucket(b.dueAt, now);
  if (dayDiff !== 0) return dayDiff;

  // 2–5. Kind order: Call → Meeting → Task → Reminder → …
  const kindDiff = KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (kindDiff !== 0) return kindDiff;

  // 6. Oldest created date wins
  const aCreated = a.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bCreated = b.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.id.localeCompare(b.id);
}

/** Pending competitors only (broken + scheduled). */
export function pendingCandidates(
  candidates: LeadActivityCandidate[],
): LeadActivityCandidate[] {
  return candidates.filter(
    (c) => c.bucket === "broken" || c.bucket === "scheduled",
  );
}

/** Sort pending activities with the card algorithm (expanded list order). */
export function sortActivityCandidates(
  candidates: LeadActivityCandidate[],
  now = new Date(),
): LeadActivityCandidate[] {
  return [...pendingCandidates(candidates)].sort((a, b) =>
    compareActivityCandidates(a, b, now),
  );
}

/**
 * Pick the Activity Summary headline + moreCount (+X).
 * moreCount is never shown as +0 — callers omit the label when 0.
 */
export function pickActivitySummary(
  candidates: LeadActivityCandidate[],
  now = new Date(),
): ActivitySummarySelection {
  const sorted = sortActivityCandidates(candidates, now);
  if (sorted.length === 0) {
    return {
      primary: null,
      moreCount: 0,
      urgency: null,
      dueLabel: "",
      sorted,
    };
  }

  const primary = sorted[0];
  return {
    primary,
    moreCount: sorted.length - 1,
    urgency: urgencyForCandidate(primary, now),
    dueLabel: formatSummaryDueLabel(primary.dueAt, {
      now,
      isMissed: primary.isMissed,
      isUnreplied: primary.isUnreplied,
      kind: primary.kind,
    }),
    sorted,
  };
}

const LAST_ACTIVITY_LABEL: Partial<Record<LeadActivityKind, string>> = {
  call: "Completed call",
  meeting: "Completed meeting",
  task: "Task completed",
  sms: "Sent SMS",
  email: "Sent email",
  note: "Note added",
  attachment: "Document uploaded",
  document: "Document requested",
  status_change: "Status changed",
  stage_change: "Stage changed",
  workflow: "Workflow completed",
  other: "Activity completed",
  reminder: "Reminder completed",
};

/**
 * Most recent completed event only (spec §6). Never pending/overdue.
 */
export function pickLastCompletedActivity(
  candidates: LeadActivityCandidate[],
  now = new Date(),
): LastActivitySelection | null {
  const completed = candidates
    .filter((c) => c.bucket === "completed" && c.dueAt)
    .sort(
      (a, b) => (b.dueAt?.getTime() ?? 0) - (a.dueAt?.getTime() ?? 0),
    );

  const event = completed[0];
  if (!event?.dueAt) return null;

  return {
    event,
    label: LAST_ACTIVITY_LABEL[event.kind] ?? "Activity completed",
    relativeTime: formatRelativeTime(event.dueAt, now),
  };
}

/** Truncate title for card face; full title stays on the candidate. */
export function truncateActivityTitle(title: string, max = 36): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}
