"use client";

import { useState, useRef, useEffect } from "react";
import {
  Phone,
  Clock,
  Flag,
  UserPlus,
  Check,
  RotateCcw,
  MessageCircle,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import type { Call, CallStatus } from "@/lib/calls/types";
import { CALL_STAGES } from "@/lib/calls/types";
import { isCallOverdue, parseCallWhen } from "@/lib/calls/store";
import type { Priority } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { useRouter } from "next/navigation";

interface CallCardProps {
  call: Call;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onChangeStatus?: (callId: string, status: CallStatus) => void;
  onChangePriority?: (callId: string, priority: Priority) => void;
  onAssignUser?: (callId: string, user: string) => void;
  onAddComment?: (callId: string, comment: string) => void;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
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
  onDragStart,
  onDragEnd,
  isDragging,
  onChangeStatus,
  onChangePriority,
  onAssignUser,
  onAddComment,
  isSelected = false,
  onSelect,
}: CallCardProps) {
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [assignedUserText, setAssignedUserText] = useState("");

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

  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    wasDragging.current = true;
    onDragStart(e);
  };

  const handleCardDragEnd = () => {
    onDragEnd();
    setTimeout(() => {
      wasDragging.current = false;
    }, 0);
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

  const submitAssignUser = () => {
    const trimmed = assignedUserText.trim();
    if (!trimmed) {
      toast.error("User name can't be empty");
      return;
    }
    onAssignUser?.(call.id, trimmed);
    toast.success(`Assigned to ${trimmed}`);
    setAssignedUserText("");
    setShowAssignModal(false);
  };

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      toast.error("Note can't be empty");
      return;
    }
    onAddComment?.(call.id, trimmed);
    toast.success("Note added");
    setCommentText("");
    setShowCommentModal(false);
  };

  const hasCommentsOrAttachments = Boolean(
    (call as any).commentsCount || call.attachmentsCount,
  );

  function goToCall() {
    if (wasDragging.current) return;
    router.push(`/activities/calls/detail/${call.id}`);
  }

  return (
    <>
      <div
        draggable
        role="link"
        tabIndex={0}
        onDragStart={handleCardDragStart}
        onDragEnd={handleCardDragEnd}
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
                  <MessageCircle className="h-3.5 w-3.5" />
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
            onClick={() => setShowAssignModal(true)}
            title="Assign user"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>

          {/* Add note — same icon as Task */}
          <button
            type="button"
            onClick={() => setShowCommentModal(true)}
            title="Add note"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Assign Call to User
            </h3>
            <input
              type="text"
              placeholder="Enter name"
              value={assignedUserText}
              onChange={(e) => setAssignedUserText(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssignUser}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add note modal */}
      {showCommentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCommentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Add note
            </h3>
            <textarea
              rows={3}
              placeholder="Write a note…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitComment}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                Add note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
