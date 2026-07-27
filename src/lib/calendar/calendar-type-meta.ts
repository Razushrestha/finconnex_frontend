import type { CalendarItemType } from "@/lib/calendar/types";

export const TYPE_META: Record<
  CalendarItemType,
  {
    label: string;
    dot: string;
    soft: string;
    text: string;
    bar: string;
    solid: string;
  }
> = {
  Event: {
    label: "Event",
    dot: "bg-violet-500",
    soft: "bg-violet-50/90",
    text: "text-violet-800",
    bar: "bg-violet-500",
    solid: "bg-violet-600",
  },
  Task: {
    label: "Task",
    dot: "bg-amber-500",
    soft: "bg-amber-50/90",
    text: "text-amber-900",
    bar: "bg-amber-500",
    solid: "bg-amber-600",
  },
  Meeting: {
    label: "Meeting",
    dot: "bg-sky-500",
    soft: "bg-sky-50/90",
    text: "text-sky-900",
    bar: "bg-sky-500",
    solid: "bg-sky-600",
  },
  Reminder: {
    label: "Reminder",
    dot: "bg-rose-500",
    soft: "bg-rose-50/90",
    text: "text-rose-900",
    bar: "bg-rose-500",
    solid: "bg-rose-600",
  },
};

export const TYPE_FILTERS: (CalendarItemType | "All")[] = [
  "All",
  "Event",
  "Task",
  "Meeting",
  "Reminder",
];
