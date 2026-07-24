/** Date helpers for lead-card activity ranking (DD/MM/YYYY + ISO). */

export function parseFlexibleDate(raw?: string | null): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i,
  );
  if (m) {
    let hours = m[4] ? Number(m[4]) : 12;
    const mins = m[5] ? Number(m[5]) : 0;
    const ap = m[6]?.toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    if (!ap) {
      // Date-only: noon local so day math is stable
      hours = 12;
    }
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hours, mins);
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function hasClockTime(raw?: string | null) {
  return !!raw && /\d{1,2}:\d{2}/.test(raw);
}

/** Relative time for Last Activity (card face). */
export function formatRelativeTime(at: Date, now = new Date()): string {
  const diffMs = now.getTime() - at.getTime();
  if (diffMs < 0) return "Just now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Due / schedule label for Activity Summary. */
export function formatSummaryDueLabel(
  dueAt: Date | null,
  opts: {
    now?: Date;
    isMissed?: boolean;
    isUnreplied?: boolean;
    kind?: string;
  } = {},
): string {
  const now = opts.now ?? new Date();
  if (opts.isMissed) return "Missed";
  if (opts.isUnreplied) {
    if (!dueAt) return "Unreplied";
    const days = Math.floor(
      (startOfDay(now).getTime() - startOfDay(dueAt).getTime()) / 86_400_000,
    );
    if (days <= 0) return "Received today";
    if (days === 1) return "Unreplied 1 day";
    return `Unreplied ${days} days`;
  }
  if (!dueAt) return "";

  const today = startOfDay(now).getTime();
  const day = startOfDay(dueAt).getTime();
  const diff = Math.round((day - today) / 86_400_000);

  if (diff < 0) {
    const n = Math.abs(diff);
    return n === 1 ? "Overdue 1 day" : `Overdue ${n} days`;
  }
  if (diff === 0) {
    const time = dueAt.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    // Date-only noon → "Due today" without clock
    if (dueAt.getHours() === 12 && dueAt.getMinutes() === 0) {
      return "Due today";
    }
    return `Due today, ${time}`;
  }

  return dueAt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
