"use client";

import { useRef, useState } from "react";
import { toast } from "@/lib/notify/toast";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import {
  Calendar,
  Building2,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  FileText,
  Paperclip,
  Check,
  RotateCcw,
  Flag,
  UserPlus,
  Search,
  Plus,
} from "lucide-react";
import type { Task, TaskStatus, Priority } from "@/lib/tasks/types";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_OWNERS } from "@/lib/tasks/types";
import { resolveAssignableOwnerName } from "@/lib/users/assignable";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { ArrowTag } from "@/components/common/ArrowTag";
import { useRouter } from "next/navigation";
import { formatRelatedTo } from "@/lib/activities/shared";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";
import {
  LeadSideDrawer,
  LEAD_QUICK_DRAWER_WIDTH,
} from "@/components/sales/leads/panels/LeadSideDrawer";

interface TaskCardProps {
  task: Task;
  columnId: string;
  onDragPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
  isDragging: boolean;
  onChangeStatus?: (taskId: string, status: TaskStatus) => void;
  onChangePriority?: (taskId: string, priority: Priority) => void;
  onAssignUser?: (taskId: string, user: string) => void;
  onChangeCollaborators?: (taskId: string, collaborators: string[]) => void;
  onAddComment?: (taskId: string, comment: string) => void;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

const priorityClass: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-sky-500",
};

const priorityTone: Record<
  Priority,
  { dot: string; selected: string }
> = {
  Critical: {
    dot: "bg-red-500",
    selected: "border-red-200 bg-red-50 text-red-700",
  },
  High: {
    dot: "bg-orange-500",
    selected: "border-orange-200 bg-orange-50 text-orange-700",
  },
  Medium: {
    dot: "bg-amber-500",
    selected: "border-amber-200 bg-amber-50 text-amber-800",
  },
  Low: {
    dot: "bg-sky-500",
    selected: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

const priorityIcon: Record<string, React.ElementType> = {
  Critical: ArrowUp,
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
};

function parseDueDate(dueDate: string): Date | null {
  const m = dueDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function overdueDays(dueDate: string): number | null {
  const parsed = parseDueDate(dueDate);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff : null;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type TaskQuickPanel = "status" | "priority" | "owner" | "notes";

const QUICK_PANELS: { id: TaskQuickPanel; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
  { id: "priority", label: "Priority" },
  { id: "notes", label: "Notes" },
];

/** Survives the card moving between kanban columns so the drawer stays open. */
const openTaskPanels = new Map<string, TaskQuickPanel>();

export function TaskCard({
  task,
  columnId,
  onDragPointerDown,
  onDragClickCapture,
  isDragging,
  onChangeStatus,
  onChangePriority,
  onAssignUser,
  onChangeCollaborators,
  onAddComment,
  isSelected = false,
  onSelect,
}: TaskCardProps) {
  const router = useRouter();
  const days = task.overdue ? overdueDays(task.dueDate) : null;
  const PriorityIcon =
    priorityIcon[task.priority as keyof typeof priorityIcon] ?? ArrowRight;
  const collaborators = (task.collaborators ?? [])
    .map((name) => resolveAssignableOwnerName(name) || name)
    .filter(Boolean);
  const visibleCollaborators = collaborators.slice(0, 2);
  const extraCollaborators = collaborators.length - visibleCollaborators.length;
  const hasFooterMeta =
    visibleCollaborators.length > 0 ||
    !!task.commentsCount ||
    !!task.attachmentsCount;
  const isCompleted = task.status === "Completed";

  const [panel, setPanel] = useState<TaskQuickPanel | null>(
    () => openTaskPanels.get(task.taskId) ?? null,
  );

  function rememberPanel(next: TaskQuickPanel | null) {
    if (next) openTaskPanels.set(task.taskId, next);
    else openTaskPanels.delete(task.taskId);
    setPanel(next);
  }
  const [assignModalTab, setAssignModalTab] = useState<
    "owner" | "collaborators"
  >("owner");
  const [assignSearch, setAssignSearch] = useState("");

  const footerRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    onDragPointerDown(e);
  };

  const markComplete = () => {
    if (isCompleted) return;
    onChangeStatus?.(task.taskId, "Completed");
    toast.success(`"${task.title}" marked as completed`);
  };

  const selectStatus = (status: TaskStatus) => {
    onChangeStatus?.(task.taskId, status);
    toast.success(`Status changed to "${status}"`);
  };

  const selectPriority = (priority: Priority) => {
    onChangePriority?.(task.taskId, priority);
    toast.success(`Priority changed to "${priority}"`);
  };

  const selectUser = (user: string) => {
    onAssignUser?.(task.taskId, user);
    toast.success(`Assigned to ${user}`);
  };

  function toggleCollaborator(name: string) {
    const current = task.collaborators ?? [];
    const next = current.includes(name)
      ? current.filter((f) => f !== name)
      : current.length >= 3
        ? current
        : [...current, name];
    onChangeCollaborators?.(task.taskId, next);
  }

  function addCollaboratorFromSearch() {
    const name = assignSearch.trim();
    if (!name) return;
    const current = task.collaborators ?? [];
    if (current.length >= 3) {
      toast.error("You can add up to 3 collaborators");
      return;
    }
    if (name === task.assignedTo) {
      toast.error("Owner can't also be a collaborator");
      return;
    }
    if (current.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    onChangeCollaborators?.(task.taskId, [...current, name]);
    setAssignSearch("");
    toast.success(`Added ${name} as collaborator`);
  }

  function openPanel(next: TaskQuickPanel) {
    rememberPanel(panel === next ? null : next);
    if (next === "owner") {
      setAssignModalTab("owner");
      setAssignSearch("");
    }
  }

  function selectPanel(next: TaskQuickPanel) {
    rememberPanel(next);
    if (next === "owner") setAssignSearch("");
  }

  const assignQuery = assignSearch.trim().toLowerCase();
  const filteredOwners = TASK_OWNERS.filter((owner) =>
    assignQuery ? owner.toLowerCase().includes(assignQuery) : true,
  );
  const collaboratorPool = Array.from(
    new Set([...TASK_OWNERS, ...(task.collaborators ?? [])]),
  ).filter((name) => name !== task.assignedTo);
  const filteredCollaborators = collaboratorPool.filter((name) =>
    assignQuery ? name.toLowerCase().includes(assignQuery) : true,
  );
  const canAddCollaborator =
    assignModalTab === "collaborators" &&
    Boolean(assignSearch.trim()) &&
    (task.collaborators?.length ?? 0) < 3 &&
    assignSearch.trim() !== task.assignedTo &&
    !collaboratorPool.some(
      (name) => name.toLowerCase() === assignSearch.trim().toLowerCase(),
    );

  return (
    <>
    <div
      draggable={false}
      onPointerDown={handleDragStart}
      onClickCapture={onDragClickCapture}
      onDragStart={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (wasDragging.current) return;
          if (
            footerRef.current &&
            footerRef.current.contains(e.target as Node)
          ) {
            return;
          }
          router.push(`/activities/tasks/detail/${task.taskId}`);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/activities/tasks/detail/${task.taskId}`);
          }
        }}
        data-focus-id={task.taskId}
      data-task-id={task.taskId}
      data-column-id={columnId}
        className={cn(
          "group/card relative cursor-pointer",
          entityCardBox,
          cardMotion,
          isDragging && cardDragging,
          isSelected
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-slate-200/80 hover:border-slate-300 hover:bg-violet-50/40",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2.5">
          <h4
            className={cn(
              "mb-2 truncate text-[13px] font-semibold text-primary",
              cardSubject,
            )}
            title={task.title}
          >
        {task.title}
      </h4>

          {onSelect && (
            <div
              className={cn(
                "shrink-0 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover/card:opacity-100",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select task ${task.title}`}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="mb-2.5 flex items-center justify-between gap-2">
          {task.dueDate.trim() && days !== null ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Overdue {days} {days === 1 ? "day" : "days"}
              </span>
            </span>
          ) : task.dueDate.trim() ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">Due {task.dueDate}</span>
            </span>
          ) : (
            <span />
          )}
          <ArrowTag
            compact
            className={priorityClass[task.priority] || "bg-slate-500"}
          >
            <PriorityIcon className="h-3 w-3" />
            {task.priority}
          </ArrowTag>
        </div>

        <CardOwnerRow
          name={task.assignedTo}
          className="mb-1.5 text-slate-600"
        />

        {task.relatedTo ? (
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
            <RelatedToLink
              relatedTo={task.relatedTo}
              className="font-medium text-sky-600"
            />
          </div>
        ) : null}

        <div className="flex-1" />

        {hasFooterMeta ? (
          <div className="mb-2 flex items-center justify-between">
            {visibleCollaborators.length > 0 ? (
              <div className="flex items-center">
                {visibleCollaborators.map((name, i) => (
        <span
                    key={name}
                    style={{ marginLeft: i === 0 ? 0 : -8 }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600"
                  >
                    {initialsOf(name)}
                  </span>
                ))}
                {extraCollaborators > 0 ? (
                  <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                    +{extraCollaborators}
                  </span>
                ) : null}
              </div>
            ) : (
              <span />
            )}

            {task.commentsCount || task.attachmentsCount ? (
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {task.commentsCount ? (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {task.commentsCount}
                  </span>
                ) : null}
                {task.attachmentsCount ? (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    {task.attachmentsCount}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          ref={footerRef}
          className="relative flex items-center justify-between border-t border-slate-50 pt-2"
        >
          <button
            type="button"
            onClick={markComplete}
            title={isCompleted ? "Completed" : "Mark complete"}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isCompleted
                ? "bg-emerald-100 text-emerald-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => openPanel("status")}
            title={`Status: ${task.status}`}
            aria-pressed={panel === "status"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
              panel === "status" ? "bg-slate-100 text-slate-600" : ""
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => openPanel("priority")}
            title={`Priority: ${task.priority}`}
            aria-pressed={panel === "priority"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
              panel === "priority" ? "bg-slate-100 text-slate-600" : ""
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => openPanel("owner")}
            title="Change owner"
            aria-pressed={panel === "owner"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
              panel === "owner" ? "bg-slate-100 text-slate-600" : ""
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openPanel("notes")}
            title="Notes"
            aria-pressed={panel === "notes"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
              panel === "notes" ? "bg-slate-100 text-slate-600" : ""
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {panel ? (
        <LeadSideDrawer
          open
          onClose={() => rememberPanel(null)}
          title={task.title}
          subtitle={QUICK_PANELS.find((item) => item.id === panel)?.label}
          widthClassName={LEAD_QUICK_DRAWER_WIDTH}
          ariaLabel={`${QUICK_PANELS.find((item) => item.id === panel)?.label} for ${task.title}`}
        >
          <div className="flex h-full min-h-0">
            <nav className="w-40 shrink-0 border-r border-slate-100 bg-slate-50/40 py-3 sm:w-44">
              {QUICK_PANELS.map((item) => {
                const active = panel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectPanel(item.id)}
                    aria-pressed={active}
                    className={cn(
                      "block w-full border-l-2 px-4 py-2 text-left text-[13px] font-medium transition-colors",
                      active
                        ? "border-violet-600 bg-violet-50 text-violet-700"
                        : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {panel === "notes" ? (
              <div className="relative min-h-0 min-w-0 flex-1">
                <div className="absolute inset-0">
                  <WorkQueueNotesDrawer
                    embedded
                    row={{
                      id: task.taskId,
                      subject: task.title,
                      related: formatRelatedTo(task.relatedTo) || undefined,
                      href: `/activities/tasks/detail/${task.taskId}`,
                    }}
                    onClose={() => rememberPanel(null)}
                    onChanged={(message) => toast.success(message)}
                  />
                </div>
              </div>
            ) : panel === "status" ? (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {TASK_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => selectStatus(status)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-50 ${
                        status === task.status
                          ? "bg-sky-50 font-semibold text-sky-700"
                          : "text-slate-700"
                      }`}
                    >
                      {status}
                      {status === task.status ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : panel === "priority" ? (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-1.5">
                  {TASK_PRIORITIES.map((priority) => {
                    const selected = priority === task.priority;
                    const tone = priorityTone[priority];
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => selectPriority(priority)}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                          selected
                            ? cn("font-semibold", tone.selected)
                            : "border-transparent text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            tone.dot,
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">{priority}</span>
                        {selected ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex rounded-md bg-slate-100 p-0.5 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setAssignModalTab("owner");
                  setAssignSearch("");
                }}
                className={`flex-1 rounded-[5px] py-1 font-medium transition-colors ${
                  assignModalTab === "owner"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignModalTab("collaborators");
                  setAssignSearch("");
                }}
                className={`flex-1 rounded-[5px] py-1 font-medium transition-colors ${
                  assignModalTab === "collaborators"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Collaborators
                {task.collaborators?.length ? (
                  <span className="ml-1 text-slate-400">
                    ({task.collaborators.length})
                  </span>
                ) : null}
              </button>
            </div>

            <label className="mb-2 flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-sky-500">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAddCollaborator) {
                    e.preventDefault();
                    addCollaboratorFromSearch();
                  }
                }}
                placeholder={
                  assignModalTab === "owner"
                    ? "Search owners…"
                    : "Search or add collaborators…"
                }
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {assignModalTab === "owner" ? (
                filteredOwners.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[12px] text-slate-400">
                    No matching owners
                  </p>
                ) : (
                  filteredOwners.map((owner) => (
                    <button
                      key={owner}
                      type="button"
                      onClick={() => selectUser(owner)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50 ${
                        owner === task.assignedTo
                          ? "bg-sky-50 font-medium text-sky-700"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                        {initialsOf(owner)}
                      </span>
                      {owner}
                    </button>
                  ))
                )
              ) : (
                <>
                  {canAddCollaborator ? (
                    <button
                      type="button"
                      onClick={addCollaboratorFromSearch}
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-sky-700 hover:bg-sky-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-sky-400 text-sky-600">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                      Add “{assignSearch.trim()}”
                    </button>
                  ) : null}
                  {filteredCollaborators.length === 0 && !canAddCollaborator ? (
                    <p className="px-2 py-3 text-center text-[12px] text-slate-400">
                      {assignQuery
                        ? "No matching collaborators"
                        : "No collaborators available"}
                    </p>
                  ) : (
                    filteredCollaborators.map((owner) => {
                      const checked =
                        task.collaborators?.includes(owner) ?? false;
                      const atLimit =
                        !checked && (task.collaborators?.length ?? 0) >= 3;
                      return (
                        <button
                          key={owner}
                          type="button"
                          disabled={atLimit}
                          onClick={() => toggleCollaborator(owner)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                            checked
                              ? "bg-sky-50 text-sky-700"
                              : "text-slate-700"
                          }`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                            {initialsOf(owner)}
                          </span>
                          <span className="flex-1 font-medium">{owner}</span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-sky-600 bg-sky-600"
                                : "border-slate-300"
                            }`}
                          >
                            {checked ? (
                              <Check
                                className="h-3 w-3 text-white"
                                strokeWidth={3}
                              />
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </>
              )}
            </div>
              </div>
            )}
          </div>
        </LeadSideDrawer>
      ) : null}
    </>
  );
}
