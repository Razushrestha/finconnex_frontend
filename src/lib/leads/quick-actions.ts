/**
 * Quick-action urgency + badges for Lead Card (spec §7).
 * Clicks open LeadQuickActionDialog (intents + CRM log).
 */

import { startOfDay } from "@/lib/leads/activity-dates";
import type {
  ActivityUrgency,
  LeadActivityCandidate,
  LeadActivityKind,
  LeadCardQuickActionState,
} from "@/lib/leads/card-types";
import {
  FOREVER_NEUTRAL_QUICK_ACTIONS,
  NO_GREEN_QUICK_ACTIONS,
} from "@/lib/leads/product-decisions";

type QuickKind = LeadCardQuickActionState["kind"];

const ACTION_TO_ACTIVITY: Record<
  QuickKind,
  LeadActivityKind | null
> = {
  call: "call",
  sms: "sms",
  email: "email",
  meeting: "meeting",
  task: "task",
  note: null,
  attachment: null,
};

/** Call / SMS / Email never render green (locked product decision). */
const NO_GREEN = new Set<QuickKind>(NO_GREEN_QUICK_ACTIONS);

const FOREVER_NEUTRAL = new Set<string>(FOREVER_NEUTRAL_QUICK_ACTIONS);

function dayBucket(dueAt: Date | null, now: Date): number {
  if (!dueAt) return 3;
  const today = startOfDay(now).getTime();
  const day = startOfDay(dueAt).getTime();
  if (day < today) return 0;
  if (day === today) return 1;
  return 2;
}

function pendingForKind(
  candidates: LeadActivityCandidate[],
  kind: LeadActivityKind,
): LeadActivityCandidate[] {
  return candidates.filter(
    (c) =>
      c.kind === kind &&
      (c.bucket === "broken" || c.bucket === "scheduled"),
  );
}

function urgencyForType(
  kind: QuickKind,
  pending: LeadActivityCandidate[],
  now: Date,
): ActivityUrgency | "neutral" {
  if (pending.length === 0) return "neutral";

  const hasBroken = pending.some((c) => c.bucket === "broken");
  if (hasBroken) return "red";

  const hasToday = pending.some((c) => dayBucket(c.dueAt, now) === 1);
  if (hasToday) return "amber";

  // Future scheduled
  if (NO_GREEN.has(kind)) return "neutral";
  return "green";
}

export function buildQuickActionStates(
  candidates: LeadActivityCandidate[],
  now = new Date(),
): LeadCardQuickActionState[] {
  const order: QuickKind[] = [
    "call",
    "sms",
    "email",
    "meeting",
    "task",
    "note",
    "attachment",
  ];

  return order.map((kind) => {
    if (FOREVER_NEUTRAL.has(kind)) {
      return { kind, urgency: "neutral", badgeCount: 0 };
    }
    const activityKind = ACTION_TO_ACTIVITY[kind];
    if (!activityKind) {
      return { kind, urgency: "neutral", badgeCount: 0 };
    }
    const pending = pendingForKind(candidates, activityKind);
    const urgency = urgencyForType(kind, pending, now);
    return {
      kind,
      urgency,
      badgeCount: pending.length >= 2 ? pending.length : 0,
    };
  });
}
