/** Calendar session store (SRS §4.9). */

import {
  calendarItems as SEED,
  type CalendarItem,
  type CalendarItemType,
} from "@/lib/calendar/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { newRulesId } from "@/lib/rules/storage";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

function cloneSeed(): CalendarItem[] {
  return SEED.map((i) => ({ ...i }));
}

const store = createBoardStore({
  key: "activities:calendar:items:v1",
  seed: cloneSeed,
});

export function listCalendarItems(): CalendarItem[] {
  return store.list();
}

export function saveCalendarItems(items: CalendarItem[]) {
  store.save(items);
}

export function upsertCalendarItem(item: CalendarItem) {
  const list = listCalendarItems();
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.unshift(item);
  saveCalendarItems(list);
  return item;
}

export function createCalendarItem(input: {
  title: string;
  type: CalendarItemType;
  start: string;
  end?: string;
  owner?: string;
  relatedTo?: string;
}): CalendarItem {
  const color =
    input.type === "Task"
      ? "bg-amber-500"
      : input.type === "Meeting"
        ? "bg-sky-500"
        : input.type === "Reminder"
          ? "bg-rose-500"
          : "bg-violet-500";
  const item: CalendarItem = {
    id: newRulesId("cal"),
    title: input.title.trim(),
    type: input.type,
    start: input.start,
    end: input.end,
    owner: input.owner ?? ACTIVITY_OWNERS[0],
    relatedTo: input.relatedTo,
    colorClass: color,
  };
  return upsertCalendarItem(item);
}

/** Merge a couple of mock external-calendar events (demo Sync). */
export function syncExternalCalendarEvents(): CalendarItem[] {
  const existing = listCalendarItems();
  const ids = new Set(existing.map((e) => e.id));
  const extras = (
    [
      {
        id: "ext-google-1",
        title: "Synced: Lender catch-up (Google)",
        type: "Meeting" as const,
        start: "2026-07-23T11:00",
        end: "2026-07-23T11:30",
        owner: ACTIVITY_OWNERS[0],
        relatedTo: "External: Google Calendar",
        colorClass: "bg-sky-500",
      },
      {
        id: "ext-outlook-1",
        title: "Synced: Docs follow-up (Outlook)",
        type: "Reminder" as const,
        start: "2026-07-24T09:00",
        owner: ACTIVITY_OWNERS[1] ?? ACTIVITY_OWNERS[0],
        relatedTo: "External: Outlook",
        colorClass: "bg-rose-500",
      },
    ] satisfies CalendarItem[]
  ).filter((e) => !ids.has(e.id));

  if (extras.length) saveCalendarItems([...extras, ...existing]);
  return extras;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsStamp(isoLocal: string) {
  // Accept 2026-07-22T10:00 → 20260722T100000
  const cleaned = isoLocal.replace(/[-:]/g, "").replace("T", "T");
  if (cleaned.length >= 15) return cleaned.slice(0, 15);
  if (cleaned.length === 8) return `${cleaned}T090000`;
  return cleaned.padEnd(15, "0");
}

export function buildCalendarIcs(items: CalendarItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FinConnex//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const item of items) {
    const start = toIcsStamp(item.start);
    const end = item.end ? toIcsStamp(item.end) : start;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@finconnex.local`,
      `DTSTAMP:${toIcsStamp(new Date().toISOString().slice(0, 16))}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${icsEscape(item.title)}`,
      item.relatedTo ? `DESCRIPTION:${icsEscape(item.relatedTo)}` : "",
      `CATEGORIES:${item.type}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadCalendarIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
