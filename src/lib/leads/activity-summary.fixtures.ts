/**
 * Deterministic fixtures for Activity Summary ranking (spec §5 / §10 / §12).
 * Run: npx tsx src/lib/leads/activity-summary.fixtures.ts
 */

import {
  pickActivitySummary,
  pickLastCompletedActivity,
  sortActivityCandidates,
} from "@/lib/leads/activity-summary";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";

/** Frozen "now" for all fixtures — Wed 23 Jul 2026 12:00 local. */
export const FIXTURE_NOW = new Date(2026, 6, 23, 12, 0, 0);

function d(
  y: number,
  mo: number,
  day: number,
  h = 12,
  mi = 0,
): Date {
  return new Date(y, mo - 1, day, h, mi, 0);
}

function candidate(
  partial: Omit<LeadActivityCandidate, "createdAt"> & {
    createdAt?: Date | null;
  },
): LeadActivityCandidate {
  return {
    createdAt: partial.createdAt ?? partial.dueAt,
    ...partial,
  };
}

/** Red — overdue / missed / unreplied wins; +X = other pending. */
export const FIXTURE_RED: LeadActivityCandidate[] = [
  candidate({
    id: "task-overdue",
    kind: "task",
    title: "Submit loan application",
    dueAt: d(2026, 7, 22),
    bucket: "broken",
  }),
  candidate({
    id: "call-missed",
    kind: "call",
    title: "Cold outreach",
    dueAt: d(2026, 7, 21, 9, 15),
    bucket: "broken",
    isMissed: true,
  }),
  candidate({
    id: "meeting-future",
    kind: "meeting",
    title: "Discovery appointment",
    dueAt: d(2026, 7, 24, 10, 0),
    bucket: "scheduled",
  }),
  candidate({
    id: "call-done",
    kind: "call",
    title: "Intro call",
    dueAt: d(2026, 7, 23, 7, 0),
    bucket: "completed",
  }),
];

/** Amber — nothing broken; nearest is due today. */
export const FIXTURE_AMBER: LeadActivityCandidate[] = [
  candidate({
    id: "call-today",
    kind: "call",
    title: "Call client",
    dueAt: d(2026, 7, 23, 17, 0),
    bucket: "scheduled",
  }),
  candidate({
    id: "task-tomorrow",
    kind: "task",
    title: "Send proposal",
    dueAt: d(2026, 7, 24),
    bucket: "scheduled",
  }),
  candidate({
    id: "sms-done",
    kind: "sms",
    title: "Thanks for the chat",
    dueAt: d(2026, 7, 23, 9, 0),
    bucket: "completed",
  }),
];

/** Green — nearest scheduled is in the future. */
export const FIXTURE_GREEN: LeadActivityCandidate[] = [
  candidate({
    id: "meeting-green",
    kind: "meeting",
    title: "Discovery appointment",
    dueAt: d(2026, 7, 24, 10, 0),
    bucket: "scheduled",
  }),
  candidate({
    id: "task-later",
    kind: "task",
    title: "Prepare deck",
    dueAt: d(2026, 7, 26),
    bucket: "scheduled",
  }),
];

/** Empty summary — completed history only (§12). */
export const FIXTURE_EMPTY: LeadActivityCandidate[] = [
  candidate({
    id: "task-done",
    kind: "task",
    title: "Welcome pack sent",
    dueAt: d(2026, 7, 20, 15, 0),
    bucket: "completed",
  }),
];

/** Same due timestamp → Call beats Task (tie-breaker). */
export const FIXTURE_TIE_KIND: LeadActivityCandidate[] = [
  candidate({
    id: "task-same",
    kind: "task",
    title: "Follow up task",
    dueAt: d(2026, 7, 22, 10, 0),
    createdAt: d(2026, 7, 20, 8, 0),
    bucket: "broken",
  }),
  candidate({
    id: "call-same",
    kind: "call",
    title: "Follow up call",
    dueAt: d(2026, 7, 22, 10, 0),
    createdAt: d(2026, 7, 21, 8, 0),
    bucket: "broken",
  }),
];

/** Same due + kind → oldest created wins. */
export const FIXTURE_TIE_CREATED: LeadActivityCandidate[] = [
  candidate({
    id: "call-newer",
    kind: "call",
    title: "Newer call",
    dueAt: d(2026, 7, 22, 10, 0),
    createdAt: d(2026, 7, 21, 12, 0),
    bucket: "broken",
  }),
  candidate({
    id: "call-older",
    kind: "call",
    title: "Older call",
    dueAt: d(2026, 7, 22, 10, 0),
    createdAt: d(2026, 7, 20, 12, 0),
    bucket: "broken",
  }),
];

export interface FixtureExpectation {
  name: string;
  candidates: LeadActivityCandidate[];
  primaryId: string | null;
  urgency: "red" | "amber" | "green" | null;
  moreCount: number;
  lastActivityId?: string | null;
  sortedIds?: string[];
}

export const FIXTURE_EXPECTATIONS: FixtureExpectation[] = [
  {
    name: "red — oldest broken wins; +X excludes completed",
    candidates: FIXTURE_RED,
    // Missed call 21st is older than overdue task 22nd → call wins
    primaryId: "call-missed",
    urgency: "red",
    moreCount: 2, // task-overdue + meeting-future
    lastActivityId: "call-done",
    sortedIds: ["call-missed", "task-overdue", "meeting-future"],
  },
  {
    name: "amber — due today beats future",
    candidates: FIXTURE_AMBER,
    primaryId: "call-today",
    urgency: "amber",
    moreCount: 1,
    lastActivityId: "sms-done",
    sortedIds: ["call-today", "task-tomorrow"],
  },
  {
    name: "green — future scheduled",
    candidates: FIXTURE_GREEN,
    primaryId: "meeting-green",
    urgency: "green",
    moreCount: 1,
    lastActivityId: null,
    sortedIds: ["meeting-green", "task-later"],
  },
  {
    name: "empty — hide summary; keep last activity",
    candidates: FIXTURE_EMPTY,
    primaryId: null,
    urgency: null,
    moreCount: 0,
    lastActivityId: "task-done",
    sortedIds: [],
  },
  {
    name: "tie — Call before Task at same due",
    candidates: FIXTURE_TIE_KIND,
    primaryId: "call-same",
    urgency: "red",
    moreCount: 1,
  },
  {
    name: "tie — oldest created wins",
    candidates: FIXTURE_TIE_CREATED,
    primaryId: "call-older",
    urgency: "red",
    moreCount: 1,
  },
];

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

/** Throws if any fixture expectation fails. */
export function assertActivitySummaryFixtures(
  now: Date = FIXTURE_NOW,
): void {
  for (const fx of FIXTURE_EXPECTATIONS) {
    const summary = pickActivitySummary(fx.candidates, now);
    const last = pickLastCompletedActivity(fx.candidates, now);
    const sorted = sortActivityCandidates(fx.candidates, now);

    assert(
      (summary.primary?.id ?? null) === fx.primaryId,
      `[${fx.name}] primary expected ${fx.primaryId}, got ${summary.primary?.id ?? null}`,
    );
    assert(
      summary.urgency === fx.urgency,
      `[${fx.name}] urgency expected ${fx.urgency}, got ${summary.urgency}`,
    );
    assert(
      summary.moreCount === fx.moreCount,
      `[${fx.name}] moreCount expected ${fx.moreCount}, got ${summary.moreCount}`,
    );
    assert(
      summary.moreCount === 0 || summary.moreCount > 0,
      `[${fx.name}] moreCount must never be negative`,
    );
    if (fx.primaryId === null) {
      assert(
        summary.moreCount === 0,
        `[${fx.name}] empty summary must not expose +X`,
      );
    }
    if (fx.lastActivityId !== undefined) {
      assert(
        (last?.event.id ?? null) === fx.lastActivityId,
        `[${fx.name}] lastActivity expected ${fx.lastActivityId}, got ${last?.event.id ?? null}`,
      );
    }
    if (fx.sortedIds) {
      const ids = sorted.map((c) => c.id);
      assert(
        ids.join("|") === fx.sortedIds.join("|"),
        `[${fx.name}] sorted expected [${fx.sortedIds.join(", ")}], got [${ids.join(", ")}]`,
      );
    }
  }
}

// Allow `npx tsx src/lib/leads/activity-summary.fixtures.ts`
const isMain =
  typeof process !== "undefined" &&
  process.argv[1]?.replace(/\\/g, "/").endsWith("activity-summary.fixtures.ts");

if (isMain) {
  assertActivitySummaryFixtures();
  console.log(
    `OK — ${FIXTURE_EXPECTATIONS.length} activity-summary fixtures passed`,
  );
}
