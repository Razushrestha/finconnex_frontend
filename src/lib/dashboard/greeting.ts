/** Time-aware greeting + CRM-priority status for the dashboard hero. */

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "late";

export type HeroSignals = {
  overdueTasks: number;
  appointmentsToday: number;
  urgentOpportunities: number;
  settlementValue?: number;
  settlementTarget?: number;
};

export type DashboardHero = {
  greeting: string;
  status: string;
  period: GreetingPeriod;
  timeZone: string;
};

const PERIOD_FALLBACK: Record<GreetingPeriod, string> = {
  morning: "Here's your team's performance overview for today.",
  afternoon: "Here's what's happening across your CRM today.",
  evening: "Here's your end-of-day performance overview.",
  late: "Here's your latest CRM overview.",
};

export function greetingPeriod(hour: number): GreetingPeriod {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "late";
}

export function greetingPhrase(period: GreetingPeriod): string {
  if (period === "morning") return "Good morning";
  if (period === "afternoon") return "Good afternoon";
  if (period === "evening") return "Good evening";
  return "Welcome back";
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Prefer the user's saved zone; never use the server clock. */
export function resolveUserTimeZone(
  preferred?: string | null,
  fallback = browserTimeZone(),
): string {
  const chosen = preferred?.trim();
  if (chosen && isValidTimeZone(chosen)) return chosen;
  if (fallback && isValidTimeZone(fallback)) return fallback;
  return "UTC";
}

export function localHourInTimeZone(now: Date, timeZone: string): number {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const hour = new Intl.DateTimeFormat("en-AU", {
    timeZone: zone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed : now.getHours();
}

export function firstNameFromUser(input: {
  firstName?: string | null;
  displayName?: string | null;
}): string {
  const first = input.firstName?.trim();
  if (first) return first.split(/\s+/)[0] ?? first;
  const display = input.displayName?.trim();
  if (display) return display.split(/\s+/)[0] ?? display;
  return "there";
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function targetDelta(signals: HeroSignals): number | null {
  const target = signals.settlementTarget ?? 0;
  const value = signals.settlementValue ?? 0;
  if (target <= 0 || value <= 0) return null;
  return Math.round((value / target - 1) * 100);
}

function quietStatus(period: GreetingPeriod): string {
  return `You're all caught up. ${PERIOD_FALLBACK[period]}`;
}

export function heroStatus(period: GreetingPeriod, signals: HeroSignals): string {
  const overdue = Math.max(0, Math.round(signals.overdueTasks || 0));
  const appointments = Math.max(0, Math.round(signals.appointmentsToday || 0));
  const urgent = Math.max(0, Math.round(signals.urgentOpportunities || 0));

  const parts: string[] = [];
  if (overdue) parts.push(plural(overdue, "overdue task", "overdue tasks"));
  if (appointments) parts.push(plural(appointments, "appointment", "appointments"));
  if (urgent) parts.push(plural(urgent, "urgent opportunity", "urgent opportunities"));

  if (parts.length >= 2) {
    return `You have ${joinList(parts)} today.`;
  }
  if (overdue) {
    return `You have ${plural(overdue, "overdue task", "overdue tasks")} that ${overdue === 1 ? "needs" : "need"} attention today.`;
  }
  if (urgent) {
    return `${plural(urgent, "urgent opportunity", "urgent opportunities")} need${urgent === 1 ? "s" : ""} attention.`;
  }
  if (appointments) {
    return `You have ${plural(appointments, "appointment", "appointments")} scheduled today.`;
  }

  const delta = targetDelta(signals);
  if (delta != null && delta >= 1) {
    return `Your team is ${delta}% ahead of target this month.`;
  }

  if (overdue === 0 && urgent === 0) return quietStatus(period);
  return PERIOD_FALLBACK[period];
}

export function buildDashboardHero(input: {
  now?: Date;
  firstName?: string | null;
  displayName?: string | null;
  timeZone?: string | null;
  signals: HeroSignals;
}): DashboardHero {
  const timeZone = resolveUserTimeZone(input.timeZone);
  const now = input.now ?? new Date();
  const period = greetingPeriod(localHourInTimeZone(now, timeZone));
  const name = firstNameFromUser({
    firstName: input.firstName,
    displayName: input.displayName,
  });
  return {
    greeting: `${greetingPhrase(period)}, ${name} 👋`,
    status: heroStatus(period, input.signals),
    period,
    timeZone,
  };
}
