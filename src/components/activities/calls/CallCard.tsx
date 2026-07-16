import { PhoneOutgoing, Clock } from "lucide-react";
import type { Call } from "@/lib/calls/types";

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const avatarColorClasses = [
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
];

function avatarColorFor(name: string) {
  const index = name.length % avatarColorClasses.length;
  return avatarColorClasses[index];
}

interface CallCardProps {
  call: Call;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function CallCard({
  call,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: CallCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-call-id={call.id}
      data-column-id={columnId}
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <PhoneOutgoing className="h-3.5 w-3.5" />
        {call.callType}
      </div>

      <h4 className="mb-1.5 text-sm font-semibold text-slate-900">
        {call.relatedTo}
      </h4>
      <p className="mb-3 truncate text-xs text-slate-500">{call.subject}</p>

      {call.callPurpose && (
        <p className="mb-3 text-xs text-slate-500">{call.callPurpose}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {call.callStartTime}
        </div>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColorFor(
            call.callOwner,
          )}`}
        >
          {initialsOf(call.callOwner)}
        </span>
      </div>
    </div>
  );
}
