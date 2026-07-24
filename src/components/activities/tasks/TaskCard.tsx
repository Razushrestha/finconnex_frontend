// "use client";

// import { useEffect, useRef, useState } from "react";
// import { toast } from "sonner";
// import {
//   Calendar,
//   Building2,
//   User,
//   ArrowUp,
//   ArrowRight,
//   ArrowDown,
//   MessageCircle,
//   Paperclip,
//   Check,
//   RotateCcw,
//   Flag,
//   UserPlus,
//   Reply,
//   MoreHorizontal,
//   X,
// } from "lucide-react";
// import type { Task, TaskStatus, Priority } from "@/lib/tasks/types";
// import { TASK_STATUSES, TASK_PRIORITIES, TASK_OWNERS } from "@/lib/tasks/types";
// import { cn } from "@/lib/utils";
// import { cardDragging, cardMotion } from "@/lib/motion";

// interface TaskCardProps {
//   task: Task;
//   columnId: string;
//   onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
//   onDragEnd: () => void;
//   isDragging: boolean;
//   onChangeStatus?: (taskId: string, status: TaskStatus) => void;
//   onChangePriority?: (taskId: string, priority: Priority) => void;
//   onAssignUser?: (taskId: string, user: string) => void;
//   onAddComment?: (taskId: string, comment: string) => void;
// }

// const priorityClass: Record<string, string> = {
//   Critical: "bg-red-50 text-red-700",
//   High: "bg-rose-50 text-rose-700",
//   Medium: "bg-amber-50 text-amber-700",
//   Low: "bg-slate-100 text-slate-600",
// };

// const priorityIcon: Record<string, React.ElementType> = {
//   Critical: ArrowUp,
//   High: ArrowUp,
//   Medium: ArrowRight,
//   Low: ArrowDown,
// };

// function parseDueDate(dueDate: string): Date | null {
//   const [day, month, year] = dueDate.split("/").map(Number);
//   if (!day || !month || !year) return null;
//   return new Date(year, month - 1, day);
// }

// function overdueDays(dueDate: string): number | null {
//   const parsed = parseDueDate(dueDate);
//   if (!parsed) return null;
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const diff = Math.round(
//     (today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24),
//   );
//   return diff > 0 ? diff : null;
// }

// type OpenMenu = "status" | "priority" | null;

// export function TaskCard({
//   task,
//   columnId,
//   onDragStart,
//   onDragEnd,
//   isDragging,
//   onChangeStatus,
//   onChangePriority,
//   onAssignUser,
//   onAddComment,
// }: TaskCardProps) {
//   const days = task.overdue ? overdueDays(task.dueDate) : null;
//   const PriorityIcon =
//     priorityIcon[task.priority as keyof typeof priorityIcon] ?? ArrowRight;
//   const collaborators = task.collaborators ?? [];
//   const visibleCollaborators = collaborators.slice(0, 2);
//   const extraCollaborators = collaborators.length - visibleCollaborators.length;
//   const hasFooterMeta =
//     visibleCollaborators.length > 0 ||
//     !!task.commentsCount ||
//     !!task.attachmentsCount;
//   const isCompleted = task.status === "Completed";

//   const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
//   const [showAssignModal, setShowAssignModal] = useState(false);
//   const [showCommentModal, setShowCommentModal] = useState(false);
//   const [commentText, setCommentText] = useState("");

//   const footerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!openMenu) return;
//     function handleClickOutside(e: MouseEvent) {
//       if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
//         setOpenMenu(null);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, [openMenu]);

//   const markComplete = () => {
//     if (isCompleted) return;
//     onChangeStatus?.(task.taskId, "Completed");
//     toast.success(`"${task.title}" marked as completed`);
//   };

//   const selectStatus = (status: TaskStatus) => {
//     onChangeStatus?.(task.taskId, status);
//     toast.success(`Status changed to "${status}"`);
//     setOpenMenu(null);
//   };

//   const selectPriority = (priority: Priority) => {
//     onChangePriority?.(task.taskId, priority);
//     toast.success(`Priority changed to "${priority}"`);
//     setOpenMenu(null);
//   };

//   const selectUser = (user: string) => {
//     onAssignUser?.(task.taskId, user);
//     toast.success(`Assigned to ${user}`);
//     setShowAssignModal(false);
//   };

//   const submitComment = () => {
//     const trimmed = commentText.trim();
//     if (!trimmed) {
//       toast.error("Comment can't be empty");
//       return;
//     }
//     onAddComment?.(task.taskId, trimmed);
//     toast.success("Comment added");
//     setCommentText("");
//     setShowCommentModal(false);
//   };

//   return (
//     <>
//       <div
//         draggable
//         onDragStart={onDragStart}
//         onDragEnd={onDragEnd}
//         data-task-id={task.taskId}
//         data-column-id={columnId}
//         className={cn(
//           "flex h-[220px] w-full bg-white flex-col p-3 sm:h-[230px] sm:p-3.5",
//           cardMotion,
//           isDragging && cardDragging,
//         )}
//       >
//         <h4
//           className="mb-2 truncate text-[13px] font-semibold text-primary"
//           title={task.title}
//         >
//           {task.title}
//         </h4>

//         <div className="mb-2.5 flex items-center justify-between gap-2">
//           {days !== null ? (
//             <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
//               <Calendar className="h-3 w-3 shrink-0" />
//               <span className="truncate">
//                 Overdue {days} {days === 1 ? "day" : "days"}
//               </span>
//             </span>
//           ) : (
//             <span className="flex items-center gap-1 text-[11px] text-slate-500">
//               <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
//               <span className="truncate">Due {task.dueDate}</span>
//             </span>
//           )}
//           <span
//             className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass[task.priority]}`}
//           >
//             <PriorityIcon className="h-3 w-3" />
//             {task.priority}
//           </span>
//         </div>

//         <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
//           <User className="h-3 w-3 shrink-0 text-slate-400" />
//           <span className="truncate">{task.assignedTo}</span>
//         </div>

//         {task.relatedTo ? (
//           <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
//             <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
//             <span className="truncate">
//               {task.relatedTo.kind}:{" "}
//               <span className="font-medium text-sky-600">
//                 {task.relatedTo.name}
//               </span>
//             </span>
//           </div>
//         ) : null}

//         <div className="flex-1" />

//         {hasFooterMeta ? (
//           <div className="mb-2 flex items-center justify-between">
//             {visibleCollaborators.length > 0 ? (
//               <div className="flex items-center">
//                 {visibleCollaborators.map((name, i) => (
//                   <span
//                     key={name}
//                     style={{ marginLeft: i === 0 ? 0 : -8 }}
//                     className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600"
//                   >
//                     {name
//                       .split(" ")
//                       .map((p) => p[0])
//                       .join("")
//                       .slice(0, 2)
//                       .toUpperCase()}
//                   </span>
//                 ))}
//                 {extraCollaborators > 0 ? (
//                   <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
//                     +{extraCollaborators}
//                   </span>
//                 ) : null}
//               </div>
//             ) : (
//               <span />
//             )}

//             {task.commentsCount || task.attachmentsCount ? (
//               <div className="flex items-center gap-3 text-[11px] text-slate-400">
//                 {task.commentsCount ? (
//                   <span className="flex items-center gap-1">
//                     <MessageCircle className="h-3.5 w-3.5" />
//                     {task.commentsCount}
//                   </span>
//                 ) : null}
//                 {task.attachmentsCount ? (
//                   <span className="flex items-center gap-1">
//                     <Paperclip className="h-3.5 w-3.5" />
//                     {task.attachmentsCount}
//                   </span>
//                 ) : null}
//               </div>
//             ) : null}
//           </div>
//         ) : null}

//         <div
//           ref={footerRef}
//           className="relative flex items-center justify-between border-t border-slate-50 pt-2"
//         >
//           <button
//             type="button"
//             onClick={markComplete}
//             title={isCompleted ? "Completed" : "Mark complete"}
//             className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
//               isCompleted
//                 ? "bg-emerald-500 text-white"
//                 : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
//             }`}
//           >
//             <Check className="h-3.5 w-3.5" />
//           </button>

//           {/* Status dropdown */}
//           <div className="relative">
//             <button
//               type="button"
//               onClick={() =>
//                 setOpenMenu((m) => (m === "status" ? null : "status"))
//               }
//               title={`Status: ${task.status}`}
//               className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
//                 openMenu === "status" ? "bg-slate-100 text-slate-600" : ""
//               }`}
//             >
//               <RotateCcw className="h-3.5 w-3.5" />
//             </button>
//             {openMenu === "status" ? (
//               <div className="absolute bottom-9 left-1/2 z-20 w-36 -translate-x-1/2 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
//                 {TASK_STATUSES.map((status) => (
//                   <button
//                     key={status}
//                     type="button"
//                     onClick={() => selectStatus(status)}
//                     className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 ${
//                       status === task.status
//                         ? "font-semibold text-sky-600"
//                         : "text-slate-600"
//                     }`}
//                   >
//                     {status}
//                   </button>
//                 ))}
//               </div>
//             ) : null}
//           </div>

//           {/* Priority dropdown */}
//           <div className="relative">
//             <button
//               type="button"
//               onClick={() =>
//                 setOpenMenu((m) => (m === "priority" ? null : "priority"))
//               }
//               title={`Priority: ${task.priority}`}
//               className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
//                 openMenu === "priority" ? "bg-slate-100 text-slate-600" : ""
//               }`}
//             >
//               <Flag className="h-3.5 w-3.5" />
//             </button>
//             {openMenu === "priority" ? (
//               <div className="absolute bottom-9 left-1/2 z-20 w-32 -translate-x-1/2 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
//                 {TASK_PRIORITIES.map((priority) => (
//                   <button
//                     key={priority}
//                     type="button"
//                     onClick={() => selectPriority(priority)}
//                     className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 ${
//                       priority === task.priority
//                         ? "font-semibold text-sky-600"
//                         : "text-slate-600"
//                     }`}
//                   >
//                     {priority}
//                   </button>
//                 ))}
//               </div>
//             ) : null}
//           </div>

//           <button
//             type="button"
//             onClick={() => setShowAssignModal(true)}
//             title="Assign user"
//             className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
//           >
//             <UserPlus className="h-3.5 w-3.5" />
//           </button>
//           <button
//             type="button"
//             onClick={() => setShowCommentModal(true)}
//             title="Add comment"
//             className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
//           >
//             <Reply className="h-3.5 w-3.5" />
//           </button>
//           <button
//             type="button"
//             title="More"
//             className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
//           >
//             <MoreHorizontal className="h-3.5 w-3.5" />
//           </button>
//         </div>
//       </div>

//       {/* Assign user modal */}
//       {showAssignModal ? (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
//           onClick={() => setShowAssignModal(false)}
//         >
//           <div
//             onClick={(e) => e.stopPropagation()}
//             className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl"
//           >
//             <div className="mb-3 flex items-center justify-between">
//               <h3 className="text-sm font-semibold text-slate-900">
//                 Assign user
//               </h3>
//               <button
//                 type="button"
//                 onClick={() => setShowAssignModal(false)}
//                 className="text-slate-400 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4" />
//               </button>
//             </div>
//             <div className="max-h-64 space-y-1 overflow-y-auto">
//               {TASK_OWNERS.map((owner) => (
//                 <button
//                   key={owner}
//                   type="button"
//                   onClick={() => selectUser(owner)}
//                   className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50 ${
//                     owner === task.assignedTo
//                       ? "bg-sky-50 font-medium text-sky-700"
//                       : "text-slate-700"
//                   }`}
//                 >
//                   <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
//                     {owner
//                       .split(" ")
//                       .map((p) => p[0])
//                       .join("")
//                       .slice(0, 2)
//                       .toUpperCase()}
//                   </span>
//                   {owner}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       ) : null}

//       {/* Add comment modal */}
//       {showCommentModal ? (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
//           onClick={() => setShowCommentModal(false)}
//         >
//           <div
//             onClick={(e) => e.stopPropagation()}
//             className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
//           >
//             <div className="mb-3 flex items-center justify-between">
//               <h3 className="text-sm font-semibold text-slate-900">
//                 Add comment
//               </h3>
//               <button
//                 type="button"
//                 onClick={() => setShowCommentModal(false)}
//                 className="text-slate-400 hover:text-slate-600"
//               >
//                 <X className="h-4 w-4" />
//               </button>
//             </div>
//             <textarea
//               autoFocus
//               value={commentText}
//               onChange={(e) => setCommentText(e.target.value)}
//               placeholder="Write a comment…"
//               rows={4}
//               className="mb-3 w-full resize-none rounded-md border border-slate-200 p-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
//             />
//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={() => setShowCommentModal(false)}
//                 className="rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={submitComment}
//                 className="rounded-md bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-700"
//               >
//                 Comment
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";
import {
  Calendar,
  Building2,
  User,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  MessageCircle,
  Paperclip,
  Check,
  RotateCcw,
  Flag,
  UserPlus,
  Reply,
  MoreHorizontal,
  X,
  Clock,
  FileText,
  UserCircle,
} from "lucide-react";
import type { Task, TaskStatus, Priority } from "@/lib/tasks/types";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_OWNERS } from "@/lib/tasks/types";

interface TaskCardProps {
  task: Task;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onChangeStatus?: (taskId: string, status: TaskStatus) => void;
  onChangePriority?: (taskId: string, priority: Priority) => void;
  onAssignUser?: (taskId: string, user: string) => void;
  onAddComment?: (taskId: string, comment: string) => void;
}

const priorityClass: Record<string, string> = {
  Critical: "bg-red-50 text-red-700",
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

const priorityIcon: Record<string, React.ElementType> = {
  Critical: ArrowUp,
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
};

function parseDueDate(dueDate: string): Date | null {
  const [day, month, year] = dueDate.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
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

type OpenMenu = "status" | "priority" | null;

export function TaskCard({
  task,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
  onChangeStatus,
  onChangePriority,
  onAssignUser,
  onAddComment,
}: TaskCardProps) {
  const days = task.overdue ? overdueDays(task.dueDate) : null;
  const PriorityIcon =
    priorityIcon[task.priority as keyof typeof priorityIcon] ?? ArrowRight;
  const collaborators = task.collaborators ?? [];
  const visibleCollaborators = collaborators.slice(0, 2);
  const extraCollaborators = collaborators.length - visibleCollaborators.length;
  const hasFooterMeta =
    visibleCollaborators.length > 0 ||
    !!task.commentsCount ||
    !!task.attachmentsCount;
  const isCompleted = task.status === "Completed";

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [commentText, setCommentText] = useState("");

  const footerRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    wasDragging.current = true;
    onDragStart(e);
  };

  const handleDragEnd = () => {
    onDragEnd();
    // Clear the flag on next tick so the click that follows drop is still suppressed
    setTimeout(() => {
      wasDragging.current = false;
    }, 0);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (wasDragging.current) return;
    // Don't open details when the click originated from the footer action bar
    if (footerRef.current && footerRef.current.contains(e.target as Node)) {
      return;
    }
    setShowDetailsModal(true);
  };

  const markComplete = () => {
    if (isCompleted) return;
    onChangeStatus?.(task.taskId, "Completed");
    toast.success(`"${task.title}" marked as completed`);
  };

  const selectStatus = (status: TaskStatus) => {
    onChangeStatus?.(task.taskId, status);
    toast.success(`Status changed to "${status}"`);
    setOpenMenu(null);
  };

  const selectPriority = (priority: Priority) => {
    onChangePriority?.(task.taskId, priority);
    toast.success(`Priority changed to "${priority}"`);
    setOpenMenu(null);
  };

  const selectUser = (user: string) => {
    onAssignUser?.(task.taskId, user);
    toast.success(`Assigned to ${user}`);
    setShowAssignModal(false);
  };

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      toast.error("Comment can't be empty");
      return;
    }
    onAddComment?.(task.taskId, trimmed);
    toast.success("Comment added");
    setCommentText("");
    setShowCommentModal(false);
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        data-task-id={task.taskId}
        data-column-id={columnId}
        className={cn(
          "cursor-grab flex h-[220px] w-full bg-white flex-col p-3 sm:h-[230px] sm:p-3.5",
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        <h4
          className="mb-2 truncate text-[13px] font-semibold text-primary"
          title={task.title}
        >
          {task.title}
        </h4>

        <div className="mb-2.5 flex items-center justify-between gap-2">
          {days !== null ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Overdue {days} {days === 1 ? "day" : "days"}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">Due {task.dueDate}</span>
            </span>
          )}
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass[task.priority]}`}
          >
            <PriorityIcon className="h-3 w-3" />
            {task.priority}
          </span>
        </div>

        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
          <User className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{task.assignedTo}</span>
        </div>

        {task.relatedTo ? (
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">
              {task.relatedTo.kind}:{" "}
              <span className="font-medium text-sky-600">
                {task.relatedTo.name}
              </span>
            </span>
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
                    <MessageCircle className="h-3.5 w-3.5" />
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
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((m) => (m === "status" ? null : "status"))
              }
              title={`Status: ${task.status}`}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
                openMenu === "status" ? "bg-slate-100 text-slate-600" : ""
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {openMenu === "status" ? (
              <div className="absolute bottom-9 left-1/2 z-20 w-36 -translate-x-1/2 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                {TASK_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => selectStatus(status)}
                    className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 ${
                      status === task.status
                        ? "font-semibold text-sky-600"
                        : "text-slate-600"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((m) => (m === "priority" ? null : "priority"))
              }
              title={`Priority: ${task.priority}`}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 ${
                openMenu === "priority" ? "bg-slate-100 text-slate-600" : ""
              }`}
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
                    className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50 ${
                      priority === task.priority
                        ? "font-semibold text-sky-600"
                        : "text-slate-600"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            title="Assign user"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCommentModal(true)}
            title="Add comment"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="More"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Task details modal */}
      {showDetailsModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {task.taskId}
                </p>
                <h3 className="text-[15px] font-semibold text-slate-900">
                  {task.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClass[task.priority]}`}
              >
                {task.priority}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {task.status}
              </span>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {task.taskType}
              </span>
            </div>

            <div className="space-y-3 text-[13px] text-slate-700">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-400">Due date</p>
                  <p
                    className={days !== null ? "font-medium text-rose-500" : ""}
                  >
                    {task.dueDate}
                    {days !== null
                      ? ` · Overdue ${days} ${days === 1 ? "day" : "days"}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <UserCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-400">Assigned to</p>
                  <p>{task.assignedTo}</p>
                </div>
              </div>

              {task.createdBy ? (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Created by</p>
                    <p>{task.createdBy}</p>
                  </div>
                </div>
              ) : null}

              {task.relatedTo ? (
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Related to</p>
                    <p>
                      {task.relatedTo.kind}:{" "}
                      <span className="font-medium text-sky-600">
                        {task.relatedTo.name}
                      </span>
                    </p>
                  </div>
                </div>
              ) : null}

              {task.reminderDate ? (
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Reminder</p>
                    <p>{task.reminderDate}</p>
                  </div>
                </div>
              ) : null}

              {task.completedDate ? (
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-[11px] text-slate-400">Completed on</p>
                    <p>{task.completedDate}</p>
                  </div>
                </div>
              ) : null}

              {task.description ? (
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Description</p>
                    <p className="whitespace-pre-wrap">{task.description}</p>
                  </div>
                </div>
              ) : null}

              {task.notes ? (
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Notes</p>
                    <p className="whitespace-pre-wrap">{task.notes}</p>
                  </div>
                </div>
              ) : null}

              {collaborators.length > 0 ? (
                <div className="flex items-start gap-2">
                  <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="mb-1 text-[11px] text-slate-400">
                      Collaborators
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {collaborators.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-50 pt-3">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Assign user modal */}
      {showAssignModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Assign user
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {TASK_OWNERS.map((owner) => (
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
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Add comment modal */}
      {showCommentModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCommentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Add comment
              </h3>
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              rows={4}
              className="mb-3 w-full resize-none rounded-md border border-slate-200 p-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitComment}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-sky-700"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
