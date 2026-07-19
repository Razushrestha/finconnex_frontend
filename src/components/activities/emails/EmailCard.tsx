import { Mail, Clock } from "lucide-react";
import type { Email } from "@/lib/emails/types";

function initialsOf(email: string) {
  const name = email.split("@")[0] ?? email;
  return name
    .split(/[.\s]/)
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

interface EmailCardProps {
  email: Email;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function EmailCard({
  email,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: EmailCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-email-id={email.id}
      data-column-id={columnId}
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Mail className="h-3.5 w-3.5" />
        {email.relatedTo ?? "Unrelated"}
      </div>

      <h4 className="mb-1.5 truncate text-sm font-semibold text-slate-900">
        {email.subject}
      </h4>

      {/* Fixed: Join array of strings to string */}
      <p className="mb-1 truncate text-xs text-slate-500">
        To: {email.to.join(", ")}
      </p>
      <p className="mb-3 truncate text-xs text-slate-400">From: {email.from}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {/* Fixed: Use sentDate from your interface */}
          {email.sentDate ?? "N/A"}
        </div>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColorFor(
            email.from,
          )}`}
        >
          {initialsOf(email.from)}
        </span>
      </div>
    </div>
  );
}
