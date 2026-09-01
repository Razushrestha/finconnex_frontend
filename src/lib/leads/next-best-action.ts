/**
 * Next Best Action is a calculated field: the single most urgent
 * actionable activity for a lead. Completed / cancelled never qualify.
 */

import { startOfDay } from "@/lib/leads/activity-dates";

export type NextBestPriority = "high" | "normal" | "low";

export type NextBestActionInput = {
  id: string;
  at: Date;
  createdAt: Date;
  priority: NextBestPriority;
  /** Completed, cancelled, or deleted activities never qualify. */
  actionable: boolean;
};

const PRIORITY_RANK: Record<NextBestPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function isOverdueActivity(at: Date, now: Date) {
  return at.getTime() < now.getTime();
}

export function overdueDayCount(at: Date, now: Date) {
  return Math.max(
    0,
    Math.round(
      (startOfDay(now).getTime() - startOfDay(at).getTime()) / 86_400_000,
    ),
  );
}

/** 0 overdue · 1 today · 2 tomorrow · 3 later upcoming */
export function urgencyBand(
  row: NextBestActionInput,
  now: Date,
): 0 | 1 | 2 | 3 | null {
  if (!row.actionable) return null;
  if (isOverdueActivity(row.at, now)) return 0;
  const today = startOfDay(now);
  const day = startOfDay(row.at);
  if (day.getTime() === today.getTime()) return 1;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day.getTime() === tomorrow.getTime()) return 2;
  if (day.getTime() > today.getTime()) return 3;
  return null;
}

/**
 * Overdue (oldest due first) → today → tomorrow → upcoming.
 * Same due time: High → Normal → Low, then oldest created.
 */
export function pickNextBestAction<T extends NextBestActionInput>(
  rows: T[],
  now: Date,
): T | null {
  const eligible = rows.filter((row) => urgencyBand(row, now) !== null);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => {
    const bandA = urgencyBand(a, now)!;
    const bandB = urgencyBand(b, now)!;
    if (bandA !== bandB) return bandA - bandB;
    const due = a.at.getTime() - b.at.getTime();
    if (due !== 0) return due;
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0]!;
}

export function nextBestWhenLabel(at: Date, now: Date) {
  if (isOverdueActivity(at, now)) {
    const days = overdueDayCount(at, now);
    if (days >= 2) return `Overdue by ${days} days`;
    if (days === 1) {
      return `Due yesterday, ${formatClock(at)}`;
    }
  }
  return `Due ${formatDayWord(at, now)}, ${formatClock(at)}`;
}

function formatClock(at: Date) {
  return at.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayWord(at: Date, now: Date) {
  const today = startOfDay(now).getTime();
  const day = startOfDay(at).getTime();
  if (day === today) return "today";
  const tomorrow = new Date(startOfDay(now));
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === tomorrow.getTime()) return "tomorrow";
  const yesterday = new Date(startOfDay(now));
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "yesterday";
  return at.toLocaleDateString("en-AU", { day: "numeric", month: "short" }).toLowerCase();
}
