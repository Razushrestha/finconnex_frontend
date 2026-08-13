"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  RefreshCw,
  Share2,
  Download,
} from "lucide-react";
import {
  type CalendarItem,
  type CalendarItemType,
} from "@/lib/calendar/types";
import {
  buildCalendarIcs,
  createCalendarItem,
  downloadCalendarIcs,
  listCalendarItems,
  saveCalendarItems,
  syncExternalCalendarEvents,
} from "@/lib/calendar/store";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

type CalendarView = "Day" | "Week" | "Month" | "Agenda";

const TYPE_META: Record<
  CalendarItemType,
  { label: string; dot: string; soft: string; text: string; bar: string }
> = {
  Event: {
    label: "Event",
    dot: "bg-violet-500",
    soft: "bg-white",
    text: "text-violet-800",
    bar: "bg-violet-500",
  },
  Task: {
    label: "Task",
    dot: "bg-amber-500",
    soft: "bg-white",
    text: "text-amber-900",
    bar: "bg-amber-500",
  },
  Meeting: {
    label: "Meeting",
    dot: "bg-sky-500",
    soft: "bg-white",
    text: "text-sky-900",
    bar: "bg-sky-500",
  },
  Reminder: {
    label: "Reminder",
    dot: "bg-rose-500",
    soft: "bg-white",
    text: "text-rose-900",
    bar: "bg-rose-500",
  },
};

const TYPE_FILTERS: (CalendarItemType | "All")[] = [
  "All",
  "Event",
  "Task",
  "Meeting",
  "Reminder",
];

const TODAY = new Date(2026, 6, 22);

export default function CalendarPage() {
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(() =>
    listCalendarItems(),
  );
  const [view, setView] = useState<CalendarView>("Week");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]>("All");
  const [anchor, setAnchor] = useState(() => new Date(TODAY));
  const [flash, setFlash] = useState<string | null>(null);

  // Modal State for adding events
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<CalendarItemType>("Event");
  const [newDate, setNewDate] = useState(isoDate(TODAY));
  const [newTime, setNewTime] = useState("09:00");

  useEffect(() => {
    return onRulesChange(() => setCalendarItems(listCalendarItems()));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 3200);
    return () => window.clearTimeout(t);
  }, [flash]);

  function persist(next: CalendarItem[]) {
    setCalendarItems(next);
    saveCalendarItems(next);
  }

  function syncExternal() {
    const added = syncExternalCalendarEvents();
    setCalendarItems(listCalendarItems());
    setFlash(
      added.length
        ? `Synced ${added.length} external event(s)`
        : "Already up to date with Google/Outlook mock feeds",
    );
  }

  async function shareCalendar() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setFlash("Calendar link copied");
    } catch {
      setFlash(url);
    }
  }

  function exportIcs() {
    downloadCalendarIcs(
      `finconnex-calendar-${Date.now()}.ics`,
      buildCalendarIcs(calendarItems),
    );
    setFlash(`Exported ${calendarItems.length} events`);
  }

  // Drag and drop state tracking
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return calendarItems.filter(
      (item) => typeFilter === "All" || item.type === typeFilter,
    );
  }, [calendarItems, typeFilter]);

  const counts = useMemo(() => {
    const base = { Event: 0, Task: 0, Meeting: 0, Reminder: 0, All: 0 };
    for (const item of calendarItems) {
      if (base[item.type] !== undefined) base[item.type] += 1;
      base.All += 1;
    }
    return base;
  }, [calendarItems]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const periodLabel = useMemo(() => {
    if (view === "Day") {
      return anchor.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (view === "Week") {
      const a = weekDays[0];
      const b = weekDays[6];
      return `${a.getDate()} – ${b.getDate()} ${b.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
    }
    if (view === "Month") {
      return anchor.toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      });
    }
    return "Upcoming schedule";
  }, [view, anchor, weekDays]);

  function shift(dir: -1 | 1) {
    const d = new Date(anchor);
    if (view === "Day") d.setDate(d.getDate() + dir);
    else if (view === "Week") d.setDate(d.getDate() + dir * 7);
    else if (view === "Month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setAnchor(d);
  }

  function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createCalendarItem({
      title: newTitle.trim(),
      type: newType,
      start: `${newDate}T${newTime}`,
      end: `${newDate}T${String(Number(newTime.slice(0, 2)) + 1).padStart(2, "0")}${newTime.slice(2)}`,
      owner: ACTIVITY_OWNERS[0],
      relatedTo: "General",
    });
    setCalendarItems(listCalendarItems());
    setNewTitle("");
    setIsAddOpen(false);
    setFlash("Event added");
  }

  function handleDropOnDay(targetDateStr: string) {
    if (!draggedItemId) return;
    persist(
      calendarItems.map((item) => {
        if (item.id !== draggedItemId) return item;
        const timePart = item.start.includes("T")
          ? item.start.split("T")[1]
          : "09:00:00";
        const endPart =
          item.end && item.end.includes("T")
            ? item.end.split("T")[1]
            : "10:00:00";
        return {
          ...item,
          start: `${targetDateStr}T${timePart}`,
          end: `${targetDateStr}T${endPart}`,
        };
      }),
    );
    setDraggedItemId(null);
  }

  return (
    <div className={BOARD_PAGE}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Compact page chrome */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Calendar
            </h1>
          </div>

          <button
            type="button"
            onClick={syncExternal}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </button>
          <button
            type="button"
            onClick={() => void shareCalendar()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={exportIcs}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add event
          </button>
        </div>
        {flash ? (
          <p className="mt-1 text-[11px] font-medium text-emerald-700">{flash}</p>
        ) : null}

        {/* ONE surface: toolbar + grid */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-violet-600" />
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {periodLabel}
              </p>
              <span className="hidden text-[11px] text-slate-400 sm:inline">
                · {filtered.length} item{filtered.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center rounded-lg bg-slate-50 p-0.5">
                {(["Day", "Week", "Month", "Agenda"] as CalendarView[]).map(
                  (v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                        view === v
                          ? "bg-violet-600 text-white shadow-sm shadow-violet-600/25"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {v}
                    </button>
                  ),
                )}
              </div>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => shift(-1)}
                  aria-label="Previous"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAnchor(new Date(TODAY))}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  aria-label="Next"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {TYPE_FILTERS.map((t) => {
              const active = typeFilter === t;
              const count = counts[t];
              const meta = t === "All" ? null : TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all",
                    active
                      ? "bg-violet-600 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                  )}
                >
                  {meta ? (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        active ? "bg-white" : meta.dot,
                      )}
                    />
                  ) : null}
                  {t}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-white/80" : "text-slate-400",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid fills remaining height */}
          <div className="min-h-0 flex-1 overflow-auto">
            {(view === "Week" || view === "Day") && (
              <WeekDayGrid
                days={view === "Day" ? [anchor] : weekDays}
                filtered={filtered}
                columns={view === "Day" ? 1 : 7}
                onDragStartItem={setDraggedItemId}
                onDropOnDay={handleDropOnDay}
              />
            )}
            {view === "Month" && (
              <MonthGrid
                days={monthDays}
                anchor={anchor}
                filtered={filtered}
                onDragStartItem={setDraggedItemId}
                onDropOnDay={handleDropOnDay}
              />
            )}
            {view === "Agenda" && <AgendaList filtered={filtered} />}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add New Item</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q3 Strategy Review"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as CalendarItemType)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-500 bg-white"
                  >
                    <option value="Event">Event</option>
                    <option value="Task">Task</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-500"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekDayGrid({
  days,
  filtered,
  columns,
  onDragStartItem,
  onDropOnDay,
}: {
  days: Date[];
  filtered: CalendarItem[];
  columns: number;
  onDragStartItem: (id: string) => void;
  onDropOnDay: (dateStr: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid h-full min-h-[420px] grid-cols-1 divide-y divide-slate-100 md:divide-x md:divide-y-0",
        columns === 7 && "md:grid-cols-7",
      )}
    >
      {days.map((day) => {
        const key = isoDate(day);
        const items = filtered
          .filter((i) => i.start.startsWith(key))
          .sort((a, b) => a.start.localeCompare(b.start));
        const isToday = sameDay(day, TODAY);

        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOnDay(key)}
            className={cn(
              "flex min-h-0 flex-col transition-colors",
              isToday && "bg-violet-50/35",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 border-b border-slate-100/80 px-2.5 py-2",
                isToday && "border-violet-100",
              )}
            >
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {day.toLocaleDateString("en-AU", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex h-6 min-w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums",
                  isToday ? "bg-violet-600 text-white" : "text-slate-800",
                )}
              >
                {day.getDate()}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStartItem(item.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <EventChip item={item} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  days,
  anchor,
  filtered,
  onDragStartItem,
  onDropOnDay,
}: {
  days: Date[];
  anchor: Date;
  filtered: CalendarItem[];
  onDragStartItem: (id: string) => void;
  onDropOnDay: (dateStr: string) => void;
}) {
  return (
    <div className="grid h-full grid-cols-7">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div
          key={d}
          className="border-b border-slate-100 px-1.5 py-2 text-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase"
        >
          {d}
        </div>
      ))}
      {days.map((day, idx) => {
        const key = isoDate(day);
        const inMonth = day.getMonth() === anchor.getMonth();
        const isToday = sameDay(day, TODAY);
        const items = filtered.filter((i) => i.start.startsWith(key));

        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOnDay(key)}
            className={cn(
              "min-h-[88px] border-b border-slate-100 p-1 transition-colors",
              idx % 7 !== 0 && "border-l border-slate-100",
              !inMonth && "bg-slate-50/40",
              isToday && "bg-violet-50/40",
            )}
          >
            <span
              className={cn(
                "mb-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                isToday
                  ? "bg-violet-600 text-white"
                  : inMonth
                    ? "text-slate-700"
                    : "text-slate-300",
              )}
            >
              {day.getDate()}
            </span>
            <div className="space-y-0.5">
              {items.slice(0, 3).map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => onDragStartItem(item.id)}
                    className={cn(
                      "cursor-grab truncate rounded border border-slate-100 bg-white px-1 py-0.5 text-[9px] font-medium shadow-sm active:cursor-grabbing",
                      meta.text,
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                );
              })}
              {items.length > 3 ? (
                <p className="px-1 text-[9px] font-medium text-slate-400">
                  +{items.length - 3}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaList({ filtered }: { filtered: CalendarItem[] }) {
  const sorted = filtered
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-[12px] font-medium text-slate-500">
          Nothing in this filter
        </p>
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="divide-y divide-slate-100">
      {sorted.map((item) => {
        const dateKey = item.start.slice(0, 10);
        const showDate = dateKey !== lastDate;
        lastDate = dateKey;
        const meta = TYPE_META[item.type];
        const d = new Date(dateKey + "T12:00:00");

        return (
          <div key={item.id}>
            {showDate ? (
              <div className="bg-slate-50/60 px-4 py-1.5">
                <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  {d.toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            ) : null}
            <div className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/50">
              <div className="w-16 shrink-0 pt-0.5 text-right">
                <p className="text-[11px] font-semibold tabular-nums text-slate-800">
                  {formatTime(item.start)}
                </p>
                {item.end ? (
                  <p className="text-[10px] text-slate-400">
                    {formatTime(item.end)}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-1.5 h-8 w-0.5 shrink-0 rounded-full",
                  meta.bar,
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-semibold", meta.text)}>
                    {item.type}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {[item.relatedTo, item.owner].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventChip({ item }: { item: CalendarItem }) {
  const meta = TYPE_META[item.type];
  return (
    <div
      className={cn(
        "w-full rounded-md border border-slate-100 bg-white px-1.5 py-1.5 text-left shadow-sm transition-colors hover:border-slate-300",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className={cn("mt-1 h-3 w-0.5 shrink-0 rounded-full", meta.bar)}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[9px] font-semibold", meta.text)}>
            {formatTime(item.start)}
            {item.end ? `–${formatTime(item.end)}` : ""}
          </p>
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-900">
            {item.title}
          </p>
        </div>
      </div>
    </div>
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  const t = iso.split("T")[1];
  if (!t) return iso;
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
