"use client";

import {
  Bell,
  CalendarDays,
  CheckSquare,
  Phone,
  Pin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CreateActivityKind =
  | "Meeting"
  | "Call"
  | "Task"
  | "Reminder"
  | "Event";

const ACTIVITY_TYPES: {
  id: CreateActivityKind;
  label: string;
  icon: typeof CalendarDays;
  tone: string;
  iconBg: string;
}[] = [
  {
    id: "Meeting",
    label: "Meeting",
    icon: CalendarDays,
    tone: "hover:border-sky-400 hover:bg-sky-50/70",
    iconBg: "bg-sky-50 text-sky-600",
  },
  {
    id: "Call",
    label: "Call",
    icon: Phone,
    tone: "hover:border-emerald-400 hover:bg-emerald-50/70",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "Task",
    label: "Task",
    icon: CheckSquare,
    tone: "hover:border-amber-400 hover:bg-amber-50/70",
    iconBg: "bg-amber-50 text-amber-600",
  },
  {
    id: "Reminder",
    label: "Reminder",
    icon: Bell,
    tone: "hover:border-rose-400 hover:bg-rose-50/70",
    iconBg: "bg-rose-50 text-rose-600",
  },
  {
    id: "Event",
    label: "Event",
    icon: Pin,
    tone: "hover:border-violet-400 hover:bg-violet-50/70",
    iconBg: "bg-violet-50 text-violet-600",
  },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function slotToDueQuery(day: Date, hour: number) {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
}

export function slotToDateTime(day: Date, hour: number) {
  return {
    date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
    time: `${pad(hour)}:00`,
  };
}

/** Compact type picker — picking a type hands off to the real create flow. */
export function CreateActivityModal({
  open,
  day,
  hour,
  onClose,
  onPick,
}: {
  open: boolean;
  day: Date;
  hour: number;
  onClose: () => void;
  onPick: (kind: CreateActivityKind) => void;
}) {
  if (!open) return null;

  const { time } = slotToDateTime(day, hour);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-slate-900/30 px-4 pt-24 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-[15px] font-semibold text-slate-900">
              Create Activity
            </p>
            <p className="text-[11px] text-slate-400">
              {day.toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              · {time}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-2.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Activity Type
          </p>
          <div className="grid grid-cols-5 gap-2">
            {ACTIVITY_TYPES.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPick(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-3 transition-colors",
                    option.tone,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      option.iconBg,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
