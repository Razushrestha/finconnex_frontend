import {
  CalendarDays,
  CheckSquare,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { TimelineItemData } from "@/components/sales/entity-detail/types";
import type {
  ActivityTimelineRow,
  ActivityType,
  NormalizedActivityTimelineItem,
} from "@/lib/activity-timeline/types";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: CalendarDays,
  NOTE: StickyNote,
  TASK: CheckSquare,
  DEMO: CalendarDays,
  FOLLOW_UP: MessageSquare,
};

const TYPE_TONE: Record<ActivityType, string> = {
  CALL: "bg-orange-50 text-orange-600",
  EMAIL: "bg-emerald-50 text-emerald-600",
  MEETING: "bg-sky-50 text-sky-600",
  NOTE: "bg-amber-50 text-amber-700",
  TASK: "bg-violet-50 text-violet-600",
  DEMO: "bg-indigo-50 text-indigo-600",
  FOLLOW_UP: "bg-rose-50 text-rose-600",
};

const TYPE_LABEL: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  TASK: "Task",
  DEMO: "Demo",
  FOLLOW_UP: "Follow-up",
};

const TYPE_FEED_TONE: Record<
  ActivityType,
  TimelineItemData["iconTone"]
> = {
  CALL: "warning",
  EMAIL: "success",
  MEETING: "info",
  NOTE: "neutral",
  TASK: "info",
  DEMO: "info",
  FOLLOW_UP: "warning",
};

export function activityTypeIcon(type: ActivityType): LucideIcon {
  return TYPE_ICON[type] ?? StickyNote;
}

export function activityTypeTone(type: ActivityType): string {
  return TYPE_TONE[type] ?? "bg-slate-100 text-slate-600";
}

export function activityTypeLabel(type: ActivityType): string {
  return TYPE_LABEL[type] ?? type;
}

export function formatActivityWhen(
  iso: string,
  now = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = now.getTime() - date.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actorLabel(
  item: NormalizedActivityTimelineItem,
): string | undefined {
  if (!item.actor) return undefined;
  const name = [item.actor.firstName, item.actor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || undefined;
}

export function toActivityTimelineRows(
  items: NormalizedActivityTimelineItem[],
  now = new Date(),
): ActivityTimelineRow[] {
  return items.map((item) => ({
    id: item.id,
    label: item.subject || activityTypeLabel(item.activityType),
    when: formatActivityWhen(item.occurredAt, now),
    activityType: item.activityType,
    summary: item.summary,
    actorLabel: actorLabel(item),
  }));
}

export function toTimelineFeedItems(
  items: NormalizedActivityTimelineItem[],
  now = new Date(),
): TimelineItemData[] {
  return items.map((item) => {
    const type = item.activityType;
    const actor = actorLabel(item);
    return {
      id: item.id,
      type:
        type === "NOTE"
          ? "note"
          : type === "EMAIL"
            ? "email"
            : type === "CALL"
              ? "call"
              : "activity",
      icon: activityTypeIcon(type),
      iconTone: TYPE_FEED_TONE[type] ?? "neutral",
      title: item.subject || activityTypeLabel(type),
      timestampLabel: formatActivityWhen(item.occurredAt, now),
      body: item.summary,
      metaLine: actor
        ? `${activityTypeLabel(type)} · ${actor}`
        : activityTypeLabel(type),
    };
  });
}

/** Map local lead activity candidates when the live API is unavailable. */
export function candidatesToTimelineRows(
  candidates: LeadActivityCandidate[],
  limit = 6,
  now = new Date(),
): ActivityTimelineRow[] {
  const KIND_TO_TYPE: Record<string, ActivityType> = {
    call: "CALL",
    email: "EMAIL",
    sms: "EMAIL",
    meeting: "MEETING",
    note: "NOTE",
    task: "TASK",
    reminder: "FOLLOW_UP",
    attachment: "NOTE",
    document: "NOTE",
  };

  return [...candidates]
    .sort((a, b) => {
      const at = (a.dueAt ?? a.createdAt)?.getTime() ?? 0;
      const bt = (b.dueAt ?? b.createdAt)?.getTime() ?? 0;
      return bt - at;
    })
    .slice(0, limit)
    .map((c) => {
      const activityType = KIND_TO_TYPE[c.kind] ?? "NOTE";
      const whenDate = c.dueAt ?? c.createdAt;
      return {
        id: c.id,
        label: c.title,
        when: whenDate
          ? formatActivityWhen(whenDate.toISOString(), now)
          : "—",
        activityType,
      };
    });
}

export { Upload as DocumentActivityIcon };
