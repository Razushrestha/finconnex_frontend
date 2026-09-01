"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  findTaskById,
  listAllTasks,
  updateTaskDueDate,
} from "@/lib/tasks/store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { taskMatchesFilters, taskMatchesSearch } from "@/lib/tasks/search";
import type { Task, TaskFilters, TaskType } from "@/lib/tasks/types";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";

type CalRange = "day" | "week" | "month";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEFAULT_MONTH_HOUR = 9;

function slotHour(task: Task) {
  return Math.min(23, Math.max(0, taskClock(task).hour));
}

const TYPE_TONE: Record<
  TaskType,
  { chip: string; text: string; dot: string }
> = {
  Call: { chip: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500" },
  Meeting: { chip: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500" },
  Email: { chip: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  "Follow-up": { chip: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  Demo: { chip: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500" },
  Research: { chip: "bg-teal-50", text: "text-teal-800", dot: "bg-teal-500" },
  "Team Action": {
    chip: "bg-indigo-50",
    text: "text-indigo-800",
    dot: "bg-indigo-500",
  },
  Other: { chip: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
};

function filterTasks(tasks: Task[], filters: TaskFilters, search = "") {
  return tasks.filter(
    (t) => taskMatchesFilters(t, filters) && taskMatchesSearch(t, search),
  );
}

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

function dueHasClockTime(raw: string) {
  return /(?:[,\s]+\d{1,2}:\d{2})/.test(raw) || /T\d{2}:\d{2}/.test(raw);
}

function taskClock(task: Task): { hour: number; minute: number; label: string } {
  const due = parseTaskDueDate(task.dueDate);
  if (due && dueHasClockTime(task.dueDate)) {
    return {
      hour: due.getHours(),
      minute: due.getMinutes(),
      label: due.toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }
  const stamped = task.createdOn?.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (stamped) {
    let hour = Number(stamped[1]);
    const minute = Number(stamped[2]);
    const ap = stamped[3]!.toUpperCase();
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
    return {
      hour,
      minute,
      label: `${Number(stamped[1])}:${stamped[2]} ${ap}`,
    };
  }
  const hours = [9, 10, 11, 13, 14, 15, 16];
  const hour =
    hours[
      task.taskId.split("").reduce((n, c) => n + c.charCodeAt(0), 0) % hours.length
    ]!;
  const h12 = hour % 12 || 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return { hour, minute: 0, label: `${h12}:00 ${suffix}` };
}

function taskTimeLabel(task: Task) {
  return taskClock(task).label;
}

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function toDueQuery(day: Date, hour: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
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
    const left = a.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    const right = b.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (sameMonth) {
      return `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })}`;
    }
    return `${left} – ${right}`;
  }
  return cursor.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function TaskCalendarView({
  filters,
  search = "",
}: {
  filters: TaskFilters;
  search?: string;
}) {
  const [tasks, setTasks] = useState(() => listAllTasks());
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1));
  const [range, setRange] = useState<CalRange>("month");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const skipClickRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    return onRulesChange(() => setTasks(listAllTasks()));
  }, []);

  const filtered = useMemo(
    () => filterTasks(tasks, filters, search),
    [tasks, filters, search],
  );

  const visibleDays = useMemo(() => {
    if (range === "day") return [new Date(cursor)];
    if (range === "week") return weekDays(cursor);
    return monthCells(cursor);
  }, [cursor, range]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      const due = parseTaskDueDate(t.dueDate);
      if (!due) continue;
      const key = dayKey(due);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [filtered]);

  const today = new Date();
  const maxVisible = range === "month" ? 2 : range === "week" ? 8 : 24;

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
    setDraggedTaskId(null);
    setDropTargetKey(null);
  }

  function handleDropOnDay(day: Date) {
    if (!draggedTaskId) return;
    const found = findTaskById(draggedTaskId);
    if (!found) {
      markDragEnd();
      return;
    }
    const currentDue = parseTaskDueDate(found.task.dueDate);
    if (currentDue && sameDay(currentDue, day)) {
      markDragEnd();
      return;
    }
    updateTaskDueDate(draggedTaskId, day);
    markDragEnd();
  }

  function openAddSlot(day: Date, hour: number) {
    if (skipClickRef.current || draggedTaskId) return;
    router.push(
      `/activities/tasks/create?due=${encodeURIComponent(toDueQuery(day, hour))}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <h3 className="text-[15px] font-semibold text-slate-900">
          {headerTitle(cursor, range)}
        </h3>
        <div className="flex items-center gap-2">
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
              draggedTaskId={draggedTaskId}
              isDropTarget={dropTargetKey === dayKey(day) && draggedTaskId !== null}
              edgeLeft={idx % 7 !== 0}
              onDragOver={() => setDropTargetKey(dayKey(day))}
              onDragLeave={() =>
                setDropTargetKey((current) =>
                  current === dayKey(day) ? null : current,
                )
              }
              onDrop={() => handleDropOnDay(day)}
              onDragStart={setDraggedTaskId}
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
          draggedTaskId={draggedTaskId}
          isDropTarget={dropTargetKey === dayKey(cursor) && draggedTaskId !== null}
          onDragOver={() => setDropTargetKey(dayKey(cursor))}
          onDragLeave={() =>
            setDropTargetKey((current) =>
              current === dayKey(cursor) ? null : current,
            )
          }
          onDrop={() => handleDropOnDay(cursor)}
          onDragStart={setDraggedTaskId}
          onDragEnd={markDragEnd}
          onAddSlot={(hour) => openAddSlot(cursor, hour)}
        />
      ) : (
        <WeekTimeGrid
          days={visibleDays}
          today={today}
          byDay={byDay}
          draggedTaskId={draggedTaskId}
          dropTargetKey={dropTargetKey}
          onDragOverDay={(day) => setDropTargetKey(dayKey(day))}
          onDragLeaveDay={(day) =>
            setDropTargetKey((current) =>
              current === dayKey(day) ? null : current,
            )
          }
          onDropDay={handleDropOnDay}
          onDragStart={setDraggedTaskId}
          onDragEnd={markDragEnd}
          onAddSlot={openAddSlot}
        />
      )}

    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  items,
  maxVisible,
  draggedTaskId,
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
  items: Task[];
  maxVisible: number;
  draggedTaskId: string | null;
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
        {items.slice(0, maxVisible).map((task) => (
          <TaskChip
            key={task.taskId}
            task={task}
            compact
            dragging={draggedTaskId === task.taskId}
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
  draggedTaskId,
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
  items: Task[];
  draggedTaskId: string | null;
  isDropTarget: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAddSlot: (hour: number) => void;
}) {
  const hours = DAY_HOURS;
  const byHour = new Map<number, Task[]>();
  for (const task of items) {
    const hour = slotHour(task);
    const list = byHour.get(hour) ?? [];
    list.push(task);
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
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
      >
        {hours.map((hour) => {
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
              className="relative z-0 grid min-h-16 cursor-pointer grid-cols-[64px_minmax(0,1fr)] overflow-hidden border-b border-slate-100 hover:z-10 hover:bg-violet-50"
            >
              <div className="pr-2 pt-1.5 text-right text-[11px] font-medium leading-none tabular-nums text-slate-400">
                {hourLabel(hour)}
              </div>
              <div className="space-y-1 border-l border-slate-200 py-1 pr-3 pl-2">
                {slot.map((task) => (
                  <TaskChip
                    key={task.taskId}
                    task={task}
                    dragging={draggedTaskId === task.taskId}
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
  draggedTaskId,
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
  byDay: Map<string, Task[]>;
  draggedTaskId: string | null;
  dropTargetKey: string | null;
  onDragOverDay: (day: Date) => void;
  onDragLeaveDay: (day: Date) => void;
  onDropDay: (day: Date) => void;
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
                (task) => slotHour(task) === hour,
              );
              const isToday = sameDay(day, today);
              const isDropTarget = dropTargetKey === key && draggedTaskId !== null;
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
                    onDropDay(day);
                  }}
                  className={cn(
                    "relative z-0 cursor-pointer space-y-1 overflow-hidden border-l border-slate-200 p-1 hover:z-10 hover:bg-violet-50",
                    isToday && "bg-violet-50/30",
                    isDropTarget && "bg-violet-50",
                  )}
                >
                  {slot.map((task) => (
                    <TaskChip
                      key={task.taskId}
                      task={task}
                      dragging={draggedTaskId === task.taskId}
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

function TaskChip({
  task,
  dragging,
  compact = false,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  dragging: boolean;
  compact?: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const tone = TYPE_TONE[task.taskType] ?? TYPE_TONE.Other;
  return (
    <li className="relative z-0 min-w-0 shrink-0 hover:z-20">
      <Link
        href={`/activities/tasks/detail/${task.taskId}`}
        draggable
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(task.taskId);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={onDragEnd}
        title={`${task.title} — click to open`}
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
          <span className={cn("min-w-0 flex-1 truncate text-[10px] font-semibold leading-none", tone.text)}>
            {task.title}
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-[11px] font-semibold leading-tight", tone.text)}>
              {task.title}
            </span>
            <span className={cn("block text-[10px] leading-tight opacity-80", tone.text)}>
              {taskTimeLabel(task)}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
