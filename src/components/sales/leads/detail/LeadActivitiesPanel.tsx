"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  Flag,
  Filter,
  MoreVertical,
  Phone,
  Plus,
  SquareCheck,
} from "lucide-react";
import { LeadActivityScheduleModal } from "@/components/sales/leads/detail/LeadActivityScheduleModal";
import { LeadCreateTaskModal } from "@/components/sales/leads/detail/LeadCreateTaskModal";
import { avatarColor, initials } from "@/lib/activities/shared";
import { deleteCall, updateCall } from "@/lib/calls/store";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import {
  deleteMeeting,
  updateMeeting,
} from "@/lib/meetings/store";
import {
  completeTask,
  deleteTask,
  updateTaskStatus,
} from "@/lib/tasks/store";
import { startOfDay } from "@/lib/leads/activity-dates";
import type { LeadActivityCandidate } from "@/lib/leads/card-types";
import {
  emitLeadActivityChange,
  onLeadActivityChange,
} from "@/lib/leads/lead-extras-store";
import {
  isOverdueActivity,
  nextBestWhenLabel,
  pickNextBestAction,
  type NextBestPriority,
} from "@/lib/leads/next-best-action";
import type { LeadCardData } from "@/lib/leads/types";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";

const PURPLE = "#5A32A3";

type ActivityType = "task" | "call" | "meeting";
type StatusFilter = "all" | "open" | "overdue" | "completed";
type TypeFilter = "all" | ActivityType;
type SortOrder = "soonest" | "latest";

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "task", label: "Tasks" },
  { id: "call", label: "Calls" },
  { id: "meeting", label: "Meetings" },
];

type ActivityRow = {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  at: Date;
  createdAt: Date;
  bucket: "broken" | "scheduled" | "completed";
  priority: NextBestPriority;
  owner: string;
  live: boolean;
  href?: string | null;
};

function isActionable(row: ActivityRow) {
  return row.bucket !== "completed";
}

function isOverdueRow(row: ActivityRow, now: Date) {
  return isActionable(row) && isOverdueActivity(row.at, now);
}

function activityDetailHref(type: ActivityType, id: string) {
  if (type === "task") return `/activities/tasks/detail/${id}`;
  if (type === "call") return `/activities/calls/detail/${id}`;
  return `/activities/meetings/detail/${id}`;
}

function asNextBestInput(row: ActivityRow) {
  return {
    ...row,
    actionable: isActionable(row),
  };
}

const CREATE: { type: ActivityType; label: string }[] = [
  { type: "task", label: "Task" },
  { type: "call", label: "Call" },
  { type: "meeting", label: "Meeting" },
];

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function formatWhen(at: Date, now: Date) {
  const today = startOfDay(now).getTime();
  const day = startOfDay(at).getTime();
  const time = at.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (day === today) return { day: "Today", time };
  if (day === today + 86_400_000) return { day: "Tomorrow", time };
  if (day === today - 86_400_000) return { day: "Yesterday", time };
  return {
    day: at.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    time,
  };
}

function toType(kind: LeadActivityCandidate["kind"]): ActivityType | null {
  if (kind === "call") return "call";
  if (kind === "meeting") return "meeting";
  if (kind === "task" || kind === "reminder") return "task";
  return null;
}

function resolvedBucket(
  at: Date,
  now: Date,
  completed: boolean,
): ActivityRow["bucket"] {
  if (completed) return "completed";
  return at.getTime() < now.getTime() ? "broken" : "scheduled";
}

function fromLive(card: LeadCardData, now: Date): ActivityRow[] {
  return listLeadActivityCandidates(card.name, now).flatMap((item) => {
    const type = toType(item.kind);
    if (!type) return [];
    const at = item.dueAt ?? item.createdAt;
    if (!at) return [];
    const completed = item.bucket === "completed";
    return [
      {
        id: item.id,
        type,
        title: item.title,
        subtitle:
          item.body?.trim() ||
          (type === "call"
            ? "Call"
            : type === "meeting"
              ? "Meeting"
              : "Task"),
        at,
        createdAt: item.createdAt ?? at,
        bucket: resolvedBucket(at, now, completed),
        priority:
          item.priority ??
          (item.bucket === "broken" || type === "call" ? "high" : "normal"),
        owner: item.actor || card.owner,
        live: true,
        href: activityDetailHref(type, item.id),
      },
    ];
  });
}

function TypeIcon({ type }: { type: ActivityType }) {
  const Icon =
    type === "call" ? Phone : type === "meeting" ? CalendarDays : SquareCheck;
  const tone =
    type === "call"
      ? "bg-violet-50 text-violet-700"
      : type === "meeting"
        ? "bg-sky-50 text-sky-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function LeadActivitiesPanel({
  card,
  onStartCall,
  onSnooze,
}: {
  card: LeadCardData;
  onStartCall: () => void;
  onSnooze: () => void;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [priority, setPriority] = useState<"all" | NextBestPriority>("all");
  const [sort, setSort] = useState<SortOrder>("soonest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ActivityRow | null>(null);
  const [scheduleKind, setScheduleKind] = useState<"call" | "meeting" | null>(
    null,
  );
  const [editingSchedule, setEditingSchedule] = useState<ActivityRow | null>(
    null,
  );

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const offActivity = onLeadActivityChange(refresh);
    const offRules = onRulesChange(refresh);
    return () => {
      offActivity();
      offRules();
    };
  }, []);

  const rows = useMemo(() => {
    return fromLive(card, now).filter((row) => !hiddenIds.has(row.id));
  }, [card, now, hiddenIds]);

  const decorated = rows;

  const counts = {
    all: decorated.length,
    open: decorated.filter((r) => r.bucket !== "completed").length,
    overdue: decorated.filter((r) => isOverdueRow(r, now)).length,
    completed: decorated.filter((r) => r.bucket === "completed").length,
  };

  const visible = decorated
    .filter((row) => {
      if (status === "open" && row.bucket === "completed") return false;
      if (status === "overdue" && !isOverdueRow(row, now)) return false;
      if (status === "completed" && row.bucket !== "completed") return false;
      if (type !== "all" && row.type !== type) return false;
      if (priority !== "all" && row.priority !== priority) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = a.at.getTime() - b.at.getTime();
      return sort === "soonest" ? diff : -diff;
    });

  const groups = [
    {
      id: "overdue",
      label: "Overdue",
      dot: "bg-orange-500",
      items: visible.filter((r) => isOverdueRow(r, now)),
    },
    {
      id: "today",
      label: "Today",
      dot: "bg-emerald-500",
      items: visible.filter((r) => {
        if (isOverdueRow(r, now) || r.bucket === "completed") return false;
        return startOfDay(r.at).getTime() === startOfDay(now).getTime();
      }),
    },
    {
      id: "upcoming",
      label: "Upcoming",
      dot: "bg-violet-500",
      items: visible.filter((r) => {
        if (r.bucket !== "scheduled") return false;
        return startOfDay(r.at).getTime() > startOfDay(now).getTime();
      }),
    },
    {
      id: "completed",
      label: "Completed",
      dot: "bg-slate-400",
      items: visible.filter((r) => r.bucket === "completed"),
    },
  ].filter((group) => group.items.length);

  const next = pickNextBestAction(decorated.map(asNextBestInput), now);
  const nextOverdue = next ? isOverdueRow(next, now) : false;

  function hideRow(id: string) {
    setHiddenIds((ids) => new Set(ids).add(id));
  }

  function createActivity(type: ActivityType) {
    setNewOpen(false);
    setEditingTask(null);
    setEditingSchedule(null);
    if (type === "task") {
      setTaskModalOpen(true);
      return;
    }
    setScheduleKind(type);
  }

  function openActivity(item: ActivityRow) {
    setMenuId(null);
    setNewOpen(false);
    router.push(item.href ?? activityDetailHref(item.type, item.id));
  }

  function toggleComplete(item: ActivityRow) {
    if (item.type === "task") {
      if (item.bucket === "completed") {
        updateTaskStatus(item.id, "Not Started");
      } else {
        completeTask(item.id);
      }
    } else if (item.type === "call") {
      updateCall(item.id, {
        status: item.bucket === "completed" ? "Scheduled" : "Completed",
      });
    } else {
      updateMeeting(item.id, {
        status: item.bucket === "completed" ? "Scheduled" : "Completed",
      });
    }
    emitLeadActivityChange();
  }

  function deleteActivity(item: ActivityRow) {
    setMenuId(null);
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    if (item.type === "task") deleteTask(item.id);
    else if (item.type === "call") deleteCall(item.id);
    else deleteMeeting(item.id);
    emitLeadActivityChange();
    hideRow(item.id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <section className="shrink-0 border-b border-slate-100 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F6F9] px-3.5 py-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white",
              !next && "bg-slate-300",
            )}
            style={next ? { backgroundColor: PURPLE } : undefined}
          >
            {next?.type === "call" ? (
              <Phone className="h-5 w-5" />
            ) : next?.type === "meeting" ? (
              <CalendarDays className="h-5 w-5" />
            ) : (
              <SquareCheck className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Next best action
              {nextOverdue ? (
                <span className="ml-2 text-rose-500">Overdue</span>
              ) : null}
            </p>
            {next ? (
              <>
                <p className="truncate text-[16px] font-semibold text-slate-900">
                  {next.title}
                  {next.subtitle ? (
                    <span className="font-normal text-slate-500">
                      {" "}
                      — {next.subtitle}
                    </span>
                  ) : null}
                </p>
                <p className="text-[12px] text-slate-500">
                  {nextBestWhenLabel(next.at, now)} · assigned to you
                </p>
              </>
            ) : (
              <p className="text-[16px] font-semibold text-slate-500">
                No action scheduled
              </p>
            )}
          </div>
          {next ? (
            <div className="flex items-center gap-2">
              {next.type === "call" ? (
                <button
                  type="button"
                  onClick={onStartCall}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-white"
                  style={{ backgroundColor: PURPLE }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Start call
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openActivity(next)}
                  className="inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold text-white"
                  style={{ backgroundColor: PURPLE }}
                >
                  Open
                </button>
              )}
              <button
                type="button"
                onClick={onSnooze}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Snooze
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNewOpen((v) => !v);
              setFilterOpen(false);
              setSortOpen(false);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-white"
            style={{ backgroundColor: PURPLE }}
          >
            <Plus className="h-3.5 w-3.5" />
            New activity
          </button>
          {newOpen ? (
            <div className="absolute top-9 left-0 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {CREATE.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => createActivity(item.type)}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="inline-flex rounded-full bg-[#F7F6F9] p-0.5">
          {(
            [
              ["all", `All ${counts.all}`],
              ["open", `Open ${counts.open}`],
              ["overdue", `Overdue ${counts.overdue}`],
              ["completed", `Completed ${counts.completed}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={cn(
                "h-7 rounded-full px-2.5 text-[11px] font-semibold",
                status === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterOpen((v) => !v);
              setSortOpen(false);
              setNewOpen(false);
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium",
              filterOpen || type !== "all"
                ? "border-purple-200 bg-purple-50 text-[#5A32A3]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            {type === "all"
              ? "Filter"
              : TYPE_FILTERS.find((item) => item.id === type)?.label}
          </button>
          <button
            type="button"
            onClick={() => {
              setSortOpen((v) => !v);
              setFilterOpen(false);
              setNewOpen(false);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
          </button>
          {filterOpen ? (
            <>
              <button
                type="button"
                aria-label="Close filter"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute top-9 right-0 z-30 w-[13.5rem] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Type
                </p>
                <div className="inline-flex w-full rounded-full bg-[#F7F6F9] p-0.5">
                  {TYPE_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={cn(
                        "h-7 flex-1 rounded-full px-1.5 text-[11px] font-semibold",
                        type === item.id
                          ? "text-white"
                          : "text-slate-600 hover:text-slate-800",
                      )}
                      style={
                        type === item.id ? { backgroundColor: PURPLE } : undefined
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Priority
                </p>
                {(
                  [
                    ["all", "All priorities"],
                    ["high", "High"],
                    ["normal", "Normal"],
                    ["low", "Low"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPriority(id)}
                    className={cn(
                      "flex w-full rounded-lg px-2 py-1.5 text-left text-[12px]",
                      priority === id
                        ? "font-semibold text-[#5A32A3]"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {sortOpen ? (
            <div className="absolute top-9 right-0 z-20 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(
                [
                  ["soonest", "Soonest first"],
                  ["latest", "Latest first"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSort(id);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full px-3 py-1.5 text-left text-[12px]",
                    sort === id
                      ? "font-semibold text-[#5A32A3]"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">
            No activities in this view.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.id}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
                {group.label}
                <span className="text-slate-400">{group.items.length}</span>
              </p>
              <ul className="space-y-2">
                {group.items.map((item) => {
                  const when = formatWhen(item.at, now);
                  const done = item.bucket === "completed";
                  return (
                    <li key={item.id} className="relative">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openActivity(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openActivity(item);
                          }
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-[#F7F6F9] px-3 py-2.5 text-left hover:bg-slate-100"
                      >
                        {done ? (
                          <span className="h-5 w-5 shrink-0" />
                        ) : (
                          <button
                            type="button"
                            aria-label="Mark complete"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleComplete(item);
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-sm hover:bg-[#16A34A]"
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </button>
                        )}
                        <TypeIcon type={item.type} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[14px] font-semibold text-slate-900",
                              done && "text-slate-400 line-through",
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="block truncate text-[12px] text-slate-500">
                            {item.subtitle}
                          </span>
                        </span>
                        <span className="hidden w-24 shrink-0 text-right sm:block">
                          <span className="block text-[12px] font-medium text-slate-700">
                            {when.day}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {when.time}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex",
                            item.priority === "high"
                              ? "bg-rose-50 text-rose-600"
                              : item.priority === "low"
                                ? "bg-slate-50 text-slate-400"
                                : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {item.priority === "high" ? (
                            <Flag className="h-2.5 w-2.5" />
                          ) : null}
                          {item.priority === "high"
                            ? "High"
                            : item.priority === "low"
                              ? "Low"
                              : "Normal"}
                        </span>
                        <span className="hidden items-center gap-1.5 md:inline-flex">
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                              avatarColor(item.owner),
                            )}
                          >
                            {initials(item.owner)}
                          </span>
                          <span className="text-[12px] text-slate-600">
                            {shortName(item.owner)}
                          </span>
                        </span>
                        <span className="h-4 w-4 shrink-0" />
                      </div>
                      <div className="absolute top-1/2 right-3 z-10 -translate-y-1/2">
                        <button
                          type="button"
                          aria-label="Activity actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuId((id) => (id === item.id ? null : item.id));
                          }}
                          className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === item.id ? (
                          <>
                            <button
                              type="button"
                              aria-label="Close menu"
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={() => setMenuId(null)}
                            />
                            <div className="absolute top-8 right-0 z-30 w-32 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => openActivity(item)}
                                className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteActivity(item)}
                                className="flex w-full px-3 py-1.5 text-left text-[12px] text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      <LeadCreateTaskModal
        open={taskModalOpen}
        card={card}
        editTaskId={editingTask?.id ?? null}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSaved={() => setEditingTask(null)}
      />
      <LeadActivityScheduleModal
        open={scheduleKind !== null}
        kind={scheduleKind ?? "call"}
        card={card}
        editId={editingSchedule?.id ?? null}
        onClose={() => {
          setScheduleKind(null);
          setEditingSchedule(null);
        }}
        onSaved={() => setEditingSchedule(null)}
      />
    </div>
  );
}
