"use client";

import { useState, useRef, useEffect } from "react";
import {
  Phone,
  Clock,
  Flag,
  UserPlus,
  Check,
  RotateCcw,
  FileText,
  Paperclip,
  Search,
  Plus,
  X,
} from "lucide-react";
import { toast } from "@/lib/notify/toast";
import type { Call, CallStatus } from "@/lib/calls/types";
import { CALL_OWNERS, CALL_STAGES } from "@/lib/calls/types";
import { isCallOverdue, parseCallWhen } from "@/lib/calls/store";
import type { Priority } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { useRouter } from "next/navigation";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";

interface CallCardProps {
  call: Call;
  columnId: string;
  onDragPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
  isDragging: boolean;
  onChangeStatus?: (callId: string, status: CallStatus) => void;
  onChangePriority?: (callId: string, priority: Priority) => void;
  onAssignUser?: (callId: string, user: string) => void;
  onChangeCollaborators?: (callId: string, collaborators: string[]) => void;
  onAddComment?: (callId: string, comment: string) => void;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const priorityClass: Record<string, string> = {
  Critical: "bg-red-50 text-red-700",
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

type OpenMenu = "status" | "priority" | null;

export function CallCard({
  call,
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
}: CallCardProps) {
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [assignModalTab, setAssignModalTab] = useState<
    "owner" | "collaborators"
  >("owner");
  const [assignSearch, setAssignSearch] = useState("");

  const footerRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);

  // Close menus on outside click
  useEffect(() => {
    if (!openMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  const handleCardDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    onDragPointerDown(e);
  };

  const currentPriority = (call as any).priority || "Medium";
  const currentStatus = (call as any).status || columnId;
  const isCompleted = currentStatus === "Completed";
  const overdue = isCallOverdue(call);
  const overdueDays = (() => {
    const at = parseCallWhen(call.date);
    if (!at || !overdue) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const due = new Date(at);
    due.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((start.getTime() - due.getTime()) / 86400000));
  })();

  const markComplete = () => {
    if (isCompleted) return;
    onChangeStatus?.(call.id, "Completed");
    toast.success(`"${call.subject}" marked as completed`);
  };

  const selectStatus = (status: CallStatus) => {
    onChangeStatus?.(call.id, status);
    toast.success(`Status changed to "${status}"`);
    setOpenMenu(null);
  };

  const selectPriority = (priority: Priority) => {
    onChangePriority?.(call.id, priority);
    toast.success(`Priority changed to "${priority}"`);
    setOpenMenu(null);
  };

  function openAssignModal() {
    setAssignModalTab("owner");
    setAssignSearch("");
    setShowAssignModal(true);
  }

  function closeAssignModal() {
    setShowAssignModal(false);
    setAssignSearch("");
  }

  function selectOwner(user: string) {
    onAssignUser?.(call.id, user);
    toast.success(`Assigned to ${user}`);
    closeAssignModal();
  }

  function toggleCollaborator(name: string) {
    const current = call.collaborators ?? [];
    const next = current.includes(name)
      ? current.filter((c) => c !== name)
      : current.length >= 3
        ? current
        : [...current, name];
    onChangeCollaborators?.(call.id, next);
  }

  function addCollaboratorFromSearch() {
    const name = assignSearch.trim();
    if (!name) return;
    const current = call.collaborators ?? [];
    if (current.length >= 3) {
      toast.error("You can add up to 3 collaborators");
      return;
    }
    if (name === call.assignedTo) {
      toast.error("Owner can't also be a collaborator");
      return;
    }
    if (current.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    onChangeCollaborators?.(call.id, [...current, name]);
    setAssignSearch("");
    toast.success(`Added ${name} as collaborator`);
  }

  const assignQuery = assignSearch.trim().toLowerCase();
  const filteredOwners = CALL_OWNERS.filter((owner) =>
    assignQuery ? owner.toLowerCase().includes(assignQuery) : true,
  );
  const collaboratorPool = Array.from(
    new Set([...CALL_OWNERS, ...(call.collaborators ?? [])]),
  ).filter((name) => name !== call.assignedTo);
  const filteredCollaborators = collaboratorPool.filter((name) =>
    assignQuery ? name.toLowerCase().includes(assignQuery) : true,
  );
  const canAddCollaborator =
    assignModalTab === "collaborators" &&
    Boolean(assignSearch.trim()) &&
    (call.collaborators?.length ?? 0) < 3 &&
    assignSearch.trim() !== call.assignedTo &&
    !collaboratorPool.some(
      (name) => name.toLowerCase() === assignSearch.trim().toLowerCase(),
    );

  const hasCommentsOrAttachments = Boolean(
    (call as { commentsCount?: number }).commentsCount || call.attachmentsCount,
  );

  function goToCall() {
    if (wasDragging.current) return;
    router.push(`/activities/calls/detail/${call.id}`);
  }

  return (
    <>
      <div
        draggable={false}
        onPointerDown={handleCardDragStart}
        onClickCapture={onDragClickCapture}
        onDragStart={(e) => e.preventDefault()}
        role="link"
        tabIndex={0}
        onClick={(e) => {
          if (wasDragging.current) return;
          if (
            footerRef.current &&
            footerRef.current.contains(e.target as Node)
          ) {
            return;
          }
          goToCall();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToCall();
          }
        }}
        data-focus-id={call.id}
        data-call-id={call.id}
        data-column-id={columnId}
        className={cn(
          entityCardBox,
          "group/card relative flex cursor-pointer flex-col justify-between",
          cardMotion,
          isDragging && cardDragging,
          isSelected
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-slate-100 hover:border-slate-300",
        )}
      >
        <div>
          {/* Header & Checkbox */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              <Phone className="h-3 w-3" />
              {call.callType}
            </span>

            <div className="flex items-center gap-2">
              {currentPriority && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass[currentPriority] || "bg-slate-100 text-slate-600"}`}
                >
                  {currentPriority}
                </span>
              )}

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
                    aria-label={`Select call ${call.subject}`}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          <h4
            className={cn(
              "mb-1 truncate text-[13px] font-semibold text-slate-900",
              cardSubject,
            )}
            title={call.subject}
          >
            {call.subject}
          </h4>
          <p className="mb-3 truncate text-[11px] text-slate-500">
            <RelatedToLink
              relatedTo={
                call.relatedTo ||
                (call.contact ? `Contact: ${call.contact}` : undefined)
              }
            />
          </p>

          <div className="space-y-1.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock
                className={cn(
                  "h-3 w-3 shrink-0",
                  overdue ? "text-rose-500" : "text-slate-400",
                )}
              />
              {overdue ? (
                <span className="font-medium text-rose-600">
                  Overdue {overdueDays} {overdueDays === 1 ? "day" : "days"}
                </span>
              ) : (
                <span>{call.date}</span>
              )}
              {call.duration ? (
                <span className="text-slate-400">· {call.duration}</span>
              ) : null}
            </div>
            <CardOwnerRow name={call.assignedTo} />
          </div>

          {/* Optional Meta Counters (Comments/Attachments) */}
          {hasCommentsOrAttachments && (
            <div className="mt-2.5 flex items-center justify-end gap-3 text-[11px] text-slate-400">
              {(call as any).commentsCount ? (
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {(call as any).commentsCount}
                </span>
              ) : null}
              {call.attachmentsCount ? (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  {call.attachmentsCount}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Footer matching TaskCard style */}
        <div
          ref={footerRef}
          className="relative mt-3 flex items-center justify-between border-t border-slate-100 pt-2"
        >
          {/* Complete Button */}
          <button
            type="button"
            onClick={markComplete}
            title={isCompleted ? "Completed" : "Mark complete"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              isCompleted
                ? "bg-emerald-100 text-emerald-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          {/* Status Quick Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((m) => (m === "status" ? null : "status"))
              }
              title={`Status: ${currentStatus}`}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                openMenu === "status" && "bg-slate-100 text-slate-600",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {openMenu === "status" ? (
              <div className="absolute bottom-9 left-1/2 z-20 w-36 -translate-x-1/2 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                {CALL_STAGES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => selectStatus(status)}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50",
                      status === currentStatus
                        ? "font-semibold text-violet-600"
                        : "text-slate-600",
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Priority Quick Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((m) => (m === "priority" ? null : "priority"))
              }
              title={`Priority: ${currentPriority}`}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                openMenu === "priority" && "bg-slate-100 text-slate-600",
              )}
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
            {openMenu === "priority" ? (
              <div className="absolute bottom-9 left-1/2 z-20 w-32 -translate-x-1/2 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                {TASK_PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => selectPriority(priority)}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50",
                      priority === currentPriority
                        ? "font-semibold text-violet-600"
                        : "text-slate-600",
                    )}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Assign User Button */}
          <button
            type="button"
            onClick={openAssignModal}
            title="Assign user"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowNotesDrawer(true)}
            title="Notes"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Assign User Modal */}
      {showAssignModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAssignModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {assignModalTab === "owner"
                  ? "Assign Owner"
                  : "Add Collaborators"}
              </h3>
              <button
                type="button"
                onClick={closeAssignModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                {call.collaborators?.length ? (
                  <span className="ml-1 text-slate-400">
                    ({call.collaborators.length})
                  </span>
                ) : null}
              </button>
            </div>

            <label className="mb-2 flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-violet-500">
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
                      onClick={() => selectOwner(owner)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50 ${
                        owner === call.assignedTo
                          ? "bg-violet-50 font-medium text-violet-700"
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
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-violet-700 hover:bg-violet-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-violet-400 text-violet-600">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                      Add “{assignSearch.trim()}”
                    </button>
                  ) : null}
                  {filteredCollaborators.length === 0 &&
                  !canAddCollaborator ? (
                    <p className="px-2 py-3 text-center text-[12px] text-slate-400">
                      {assignQuery
                        ? "No matching collaborators"
                        : "No collaborators available"}
                    </p>
                  ) : (
                    filteredCollaborators.map((owner) => {
                      const checked =
                        call.collaborators?.includes(owner) ?? false;
                      const atLimit =
                        !checked && (call.collaborators?.length ?? 0) >= 3;
                      return (
                        <button
                          key={owner}
                          type="button"
                          disabled={atLimit}
                          onClick={() => toggleCollaborator(owner)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                            checked
                              ? "bg-violet-50 text-violet-700"
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
                                ? "border-violet-600 bg-violet-600"
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
        </div>
      ) : null}

      {showNotesDrawer ? (
        <WorkQueueNotesDrawer
          row={{
            id: call.id,
            subject: call.subject,
            related: call.relatedTo || undefined,
            contactName: call.contact,
            href: `/activities/calls/detail/${call.id}`,
          }}
          onClose={() => setShowNotesDrawer(false)}
          onChanged={(message) => toast.success(message)}
        />
      ) : null}
    </>
  );
}
