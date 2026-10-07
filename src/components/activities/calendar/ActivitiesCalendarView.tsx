"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  createCalendarItem,
  listCalendarItems,
  saveCalendarItems,
} from "@/lib/calendar/store";
import { mergeCalendarItems } from "@/lib/calendar/api";
import { useCrmCalendar } from "@/lib/calendar/use-crm-calendar";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar/types";
import AddEventModal from "@/components/activities/calendar/AddCalendarModal";
import {
  CreateActivityModal,
  slotToDateTime,
  slotToDueQuery,
  type CreateActivityKind,
} from "@/components/activities/calendar/CreateActivityModal";
import { defaultActorName } from "@/lib/rules/actor";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";

type CalRange = "day" | "week" | "month";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEFAULT_MONTH_HOUR = 9;
const DEMO_TODAY = new Date(2026, 6, 22);

const TYPE_TONE: Record<
  CalendarItemType,
  { chip: string; text: string; dot: string }
> = {
  Event: { chip: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500" },
  Task: { chip: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  Meeting: { chip: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500" },
  Call: {
    chip: "bg-emerald-50",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  Reminder: { chip: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500" },
};

const TYPE_FILTERS: (CalendarItemType | "All")[] = [
  "All",
  "Event",
  "Task",
  "Meeting",
  "Call",
  "Reminder",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function monthCells(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function weekDays(cursor: Date) {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseItemStart(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const normalized = raw.includes("T") ? raw : `${raw}T09:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function itemClock(item: CalendarItem): {
  hour: number;
  minute: number;
  label: string;
} {
  const start = parseItemStart(item.start);
  if (start) {
    return {
      hour: start.getHours(),
      minute: start.getMinutes(),
      label: start.toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }
  return { hour: DEFAULT_MONTH_HOUR, minute: 0, label: "9:00 AM" };
}

function slotHour(item: CalendarItem) {
  return Math.min(23, Math.max(0, itemClock(item).hour));
}

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function headerTitle(cursor: Date, range: CalRange) {
  if (range === "day") {
    return cursor.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (range === "week") {
    const days = weekDays(cursor);
    const a = days[0]!;
    const b = days[6]!;
    const sameMonth = a.getMonth() === b.getMonth();
    if (sameMonth) {
      return `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })}`;
    }
    const left = a.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    const right = b.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }
  return cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function itemHref(item: CalendarItem) {
  if (item.type === "Task") return "/activities/tasks";
  if (item.type === "Meeting") return "/activities/meetings";
  if (item.type === "Call") return "/activities/calls";
  if (item.type === "Reminder") return "/activities/reminders";
  return "/activities/calendar";
}

function moveItemToDay(item: CalendarItem, day: Date, hour?: number): CalendarItem {
  const start = parseItemStart(item.start);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = hour ?? start?.getHours() ?? DEFAULT_MONTH_HOUR;
  const m = start?.getMinutes() ?? 0;
  const nextStart = `${isoDate(day)}T${pad(h)}:${pad(m)}`;
  let nextEnd = item.end;
  if (item.end) {
    const end = parseItemStart(item.end);
    if (end && start) {
      const duration = end.getTime() - start.getTime();
      const nextEndDate = new Date(
        new Date(
          `${isoDate(day)}T${pad(h)}:${pad(m)}`,
        ).getTime() + Math.max(duration, 30 * 60 * 1000),
      );
      nextEnd = `${isoDate(nextEndDate)}T${pad(nextEndDate.getHours())}:${pad(nextEndDate.getMinutes())}`;
    } else {
      nextEnd = `${isoDate(day)}T${pad(h + 1)}:${pad(m)}`;
    }
  }
  return { ...item, start: nextStart, end: nextEnd };
}

export function ActivitiesCalendarView() {
  const router = useRouter();
  const [localItems, setLocalItems] = useState(() => listCalendarItems());
  const [cursor, setCursor] = useState(() => new Date(DEMO_TODAY));
  const [range, setRange] = useState<CalRange>("week");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]>("All");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [draftSlot, setDraftSlot] = useState<{ day: Date; hour: number } | null>(
    null,
  );
  const [eventSlot, setEventSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const skipClickRef = useRef(false);

  const crmView =
    range === "day" ? "Day" : range === "week" ? "Week" : "Month";
  const crm = useCrmCalendar({ view: crmView, anchor: cursor });
  const today = crm.source === "api" ? new Date() : DEMO_TODAY;

  useEffect(() => {
    return onRulesChange(() => setLocalItems(listCalendarItems()));
  }, []);

  const displayItems = useMemo(
    () => mergeCalendarItems(localItems, crm.remoteItems),
    [localItems, crm.remoteItems],
  );

  const filtered = useMemo(
    () =>
      displayItems.filter(
        (item) => typeFilter === "All" || item.type === typeFilter,
      ),
    [displayItems, typeFilter],
  );

  const counts = useMemo(() => {
    const base: Record<CalendarItemType | "All", number> = {
      Event: 0,
      Task: 0,
      Meeting: 0,
      Call: 0,
      Reminder: 0,
      All: 0,
    };
    for (const item of displayItems) {
      base[item.type] += 1;
      base.All += 1;
    }
    return base;
  }, [displayItems]);

  const visibleDays = useMemo(() => {
    if (range === "day") return [new Date(cursor)];
    if (range === "week") return weekDays(cursor);
    return monthCells(cursor);
  }, [cursor, range]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filtered) {
      const start = parseItemStart(item.start);
      if (!start) continue;
      const key = dayKey(start);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [filtered]);

  const maxVisible = range === "month" ? 2 : range === "week" ? 8 : 24;

  function persist(next: CalendarItem[]) {
    setLocalItems(next);
    saveCalendarItems(next);
  }

  function step(dir: -1 | 1) {
    const next = new Date(cursor);
    if (range === "day") next.setDate(next.getDate() + dir);
    else if (range === "week") next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setCursor(next);
  }

  function markDragEnd() {
    skipClickRef.current = true;
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 80);
    setDraggedItemId(null);
    setDropTargetKey(null);
  }

  function handleDropOnDay(day: Date, hour?: number) {
    if (!draggedItemId) return;
    const current = localItems.find((item) => item.id === draggedItemId);
    if (!current) {
      markDragEnd();
      return;
    }
    const start = parseItemStart(current.start);
    if (start && sameDay(start, day) && hour === undefined) {
      markDragEnd();
      return;
    }
    const updated = moveItemToDay(current, day, hour);
    persist(
      localItems.map((item) => (item.id === draggedItemId ? updated : item)),
    );
    markDragEnd();
  }

  function openAddSlot(day: Date, hour: number) {
    if (skipClickRef.current || draggedItemId) return;
    setDraftSlot({ day, hour });
  }

  function handlePickActivity(kind: CreateActivityKind) {
    if (!draftSlot) return;
    const { day, hour } = draftSlot;
    const { date, time } = slotToDateTime(day, hour);
    setDraftSlot(null);

    if (kind === "Event") {
      setEventSlot({ date, time });
      return;
    }
    if (kind === "Task") {
      router.push(
        `/activities/tasks/create?due=${encodeURIComponent(slotToDueQuery(day, hour))}`,
      );
      return;
    }
    if (kind === "Meeting") {
      router.push(
        `/activities/meetings/create?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
      );
      return;
    }
    if (kind === "Call") {
      router.push(
        `/activities/calls/create?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
      );
      return;
    }
    router.push(
      `/activities/reminders/create?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <h3 className="text-[15px] font-semibold text-slate-900">
          {headerTitle(cursor, range)}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5">
            {TYPE_FILTERS.map((id) => {
              const active = typeFilter === id;
              const meta = id === "All" ? null : TYPE_TONE[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTypeFilter(id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold",
                    active
                      ? "bg-white text-[#5A32A3] shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {meta ? (
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  ) : null}
                  {id}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-[#5A32A3]/70" : "text-slate-400",
                    )}
                  >
                    {counts[id]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {(["day", "week", "month"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setRange(id)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[12px] font-semibold capitalize",
                  range === id
                    ? "bg-white text-[#5A32A3] shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {id}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => step(-1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Today"
              onClick={() => setCursor(new Date(today))}
              className="rounded-md px-2 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => step(1)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {range === "month" ? (
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(5.25rem,1fr))] overflow-auto">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-b border-slate-200 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
            >
              {d}
            </div>
          ))}
          {visibleDays.map((day, idx) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              inMonth={day.getMonth() === cursor.getMonth()}
              isToday={sameDay(day, today)}
              items={byDay.get(dayKey(day)) ?? []}
              maxVisible={maxVisible}
              draggedItemId={draggedItemId}
              isDropTarget={
                dropTargetKey === dayKey(day) && draggedItemId !== null
              }
              edgeLeft={idx % 7 !== 0}
              onDragOver={() => setDropTargetKey(dayKey(day))}
              onDragLeave={() =>
                setDropTargetKey((current) =>
                  current === dayKey(day) ? null : current,
                )
              }
              onDrop={() => handleDropOnDay(day)}
              onDragStart={setDraggedItemId}
              onDragEnd={markDragEnd}
              onAdd={() => openAddSlot(day, DEFAULT_MONTH_HOUR)}
            />
          ))}
        </div>
      ) : range === "day" ? (
        <DayTimeGrid
          day={cursor}
          isToday={sameDay(cursor, today)}
          items={byDay.get(dayKey(cursor)) ?? []}
          draggedItemId={draggedItemId}
          isDropTarget={
            dropTargetKey === dayKey(cursor) && draggedItemId !== null
          }
          onDragOver={() => setDropTargetKey(dayKey(cursor))}
          onDragLeave={() =>
            setDropTargetKey((current) =>
              current === dayKey(cursor) ? null : current,
            )
          }
          onDrop={(hour) => handleDropOnDay(cursor, hour)}
          onDragStart={setDraggedItemId}
          onDragEnd={markDragEnd}
          onAddSlot={(hour) => openAddSlot(cursor, hour)}
        />
      ) : (
        <WeekTimeGrid
          days={visibleDays}
          today={today}
          byDay={byDay}
          draggedItemId={draggedItemId}
          dropTargetKey={dropTargetKey}
          onDragOverDay={(day) => setDropTargetKey(dayKey(day))}
          onDragLeaveDay={(day) =>
            setDropTargetKey((current) =>
              current === dayKey(day) ? null : current,
            )
          }
          onDropDay={handleDropOnDay}
          onDragStart={setDraggedItemId}
          onDragEnd={markDragEnd}
          onAddSlot={openAddSlot}
        />
      )}

      {draftSlot ? (
        <CreateActivityModal
          open
          day={draftSlot.day}
          hour={draftSlot.hour}
          onClose={() => setDraftSlot(null)}
          onPick={handlePickActivity}
        />
      ) : null}

      {eventSlot ? (
        <AddEventModal
          defaultDate={eventSlot.date}
          defaultTime={eventSlot.time}
          lockedType="Event"
          onClose={() => setEventSlot(null)}
          onCreate={(item) => {
            createCalendarItem({
              title: item.title,
              type: "Event",
              start: item.start,
              end: item.end,
              owner: item.owner || defaultActorName(),
              relatedTo: item.relatedTo,
            });
            setLocalItems(listCalendarItems());
            setEventSlot(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  items,
  maxVisible,
  draggedItemId,
  isDropTarget,
  edgeLeft,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onAdd,
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
  maxVisible: number;
  draggedItemId: string | null;
  isDropTarget: boolean;
  edgeLeft: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAdd}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "relative z-0 flex h-full min-h-0 cursor-pointer flex-col overflow-hidden border-b border-slate-200 p-1.5",
        edgeLeft && "border-l border-slate-200",
        !inMonth && "bg-slate-50/70",
        isToday && "bg-violet-50/40",
        isDropTarget && "bg-violet-50",
      )}
    >
      <span
        className={cn(
          "mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
          isToday
            ? "bg-[#5A32A3] text-white"
            : inMonth
              ? "text-slate-800"
              : "text-slate-300",
        )}
      >
        {day.getDate()}
      </span>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {items.slice(0, maxVisible).map((item) => (
          <ItemChip
            key={item.id}
            item={item}
            compact
            dragging={draggedItemId === item.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {items.length > maxVisible ? (
          <li className="shrink-0 px-1 text-[10px] font-semibold leading-4 text-[#5A32A3]">
            +{items.length - maxVisible}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function DayTimeGrid({
  day,
  isToday,
  items,
  draggedItemId,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onAddSlot,
}: {
  day: Date;
  isToday: boolean;
  items: CalendarItem[];
  draggedItemId: string | null;
  isDropTarget: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (hour: number) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAddSlot: (hour: number) => void;
}) {
  const byHour = new Map<number, CalendarItem[]>();
  for (const item of items) {
    const hour = slotHour(item);
    const list = byHour.get(hour) ?? [];
    list.push(item);
    byHour.set(hour, list);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center gap-1.5 border-b border-slate-200 px-3 py-2",
          isToday && "bg-violet-50/40",
        )}
      >
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          {day.toLocaleDateString("en-AU", { weekday: "short" })}
        </span>
        <span
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-md text-[12px] font-bold tabular-nums",
            isToday ? "bg-[#5A32A3] text-white" : "text-slate-800",
          )}
        >
          {day.getDate()}
        </span>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto pb-8",
          isDropTarget && "bg-violet-50/40",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDragLeave={onDragLeave}
      >
        {DAY_HOURS.map((hour) => {
          const slot = byHour.get(hour) ?? [];
          return (
            <div
              key={hour}
              role="button"
              tabIndex={0}
              onClick={() => onAddSlot(hour)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onAddSlot(hour);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(hour);
              }}
              className="relative z-0 grid min-h-16 cursor-pointer grid-cols-[64px_minmax(0,1fr)] overflow-hidden border-b border-slate-100 hover:z-10 hover:bg-violet-50"
            >
              <div className="pr-2 pt-1.5 text-right text-[11px] font-medium leading-none tabular-nums text-slate-400">
                {hourLabel(hour)}
              </div>
              <div className="space-y-1 border-l border-slate-200 py-1 pr-3 pl-2">
                {slot.map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    dragging={draggedItemId === item.id}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekTimeGrid({
  days,
  today,
  byDay,
  draggedItemId,
  dropTargetKey,
  onDragOverDay,
  onDragLeaveDay,
  onDropDay,
  onDragStart,
  onDragEnd,
  onAddSlot,
}: {
  days: Date[];
  today: Date;
  byDay: Map<string, CalendarItem[]>;
  draggedItemId: string | null;
  dropTargetKey: string | null;
  onDragOverDay: (day: Date) => void;
  onDragLeaveDay: (day: Date) => void;
  onDropDay: (day: Date, hour?: number) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAddSlot: (day: Date, hour: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200">
        <div />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={dayKey(day)}
              className={cn(
                "flex items-center justify-center gap-1 border-l border-slate-200 py-2",
                isToday && "bg-violet-50/40",
              )}
            >
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {day.toLocaleDateString("en-AU", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex h-6 min-w-6 items-center justify-center rounded-md text-[12px] font-bold tabular-nums",
                  isToday ? "bg-[#5A32A3] text-white" : "text-slate-800",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-8">
        {DAY_HOURS.map((hour) => (
          <div
            key={hour}
            className="grid min-h-16 grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-100"
          >
            <div className="pr-2 pt-1.5 text-right text-[11px] font-medium leading-none tabular-nums text-slate-400">
              {hourLabel(hour)}
            </div>
            {days.map((day) => {
              const key = dayKey(day);
              const slot = (byDay.get(key) ?? []).filter(
                (item) => slotHour(item) === hour,
              );
              const isToday = sameDay(day, today);
              const isDropTarget =
                dropTargetKey === key && draggedItemId !== null;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onAddSlot(day, hour)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onAddSlot(day, hour);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    onDragOverDay(day);
                  }}
                  onDragLeave={() => onDragLeaveDay(day)}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropDay(day, hour);
                  }}
                  className={cn(
                    "relative z-0 cursor-pointer space-y-1 overflow-hidden border-l border-slate-200 p-1 hover:z-10 hover:bg-violet-50",
                    isToday && "bg-violet-50/30",
                    isDropTarget && "bg-violet-50",
                  )}
                >
                  {slot.map((item) => (
                    <ItemChip
                      key={item.id}
                      item={item}
                      dragging={draggedItemId === item.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemChip({
  item,
  dragging,
  compact = false,
  onDragStart,
  onDragEnd,
}: {
  item: CalendarItem;
  dragging: boolean;
  compact?: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const tone = TYPE_TONE[item.type];
  return (
    <li className="relative z-0 min-w-0 shrink-0 hover:z-20">
      <Link
        href={itemHref(item)}
        draggable
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(item.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={onDragEnd}
        title={`${item.title} — click to open`}
        className={cn(
          "flex items-center gap-1 rounded-md px-1 outline-none transition-shadow",
          "cursor-pointer hover:shadow-[inset_0_0_0_1.5px_#5A32A3] hover:brightness-[0.93]",
          compact ? "h-5" : "items-start gap-1.5 px-1.5 py-1",
          tone.chip,
          dragging && "opacity-50",
        )}
      >
        <span
          className={cn(
            "shrink-0 rounded-full",
            compact ? "h-1.5 w-1.5" : "mt-1.5 h-1.5 w-1.5",
            tone.dot,
          )}
        />
        {compact ? (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[10px] font-semibold leading-none",
              tone.text,
            )}
          >
            {item.title}
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[11px] font-semibold leading-tight",
                tone.text,
              )}
            >
              {item.title}
            </span>
            <span
              className={cn(
                "block text-[10px] leading-tight opacity-80",
                tone.text,
              )}
            >
              {itemClock(item).label}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
