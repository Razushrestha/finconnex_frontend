"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  Bell,
  CheckCircle2,
  FileText,
  History,
  ListChecks,
  Mail,
  Pencil,
  PlusCircle,
  RefreshCcw,
} from "lucide-react";
import { initials } from "@/lib/activities/shared";
import {
  listTaskTimeline,
  type TaskTimelineEvent,
  type TaskTimelineKind,
} from "@/lib/tasks/timeline";
import type { Task } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | TaskTimelineKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "modified", label: "Field changes" },
  { id: "status", label: "Status" },
  { id: "note", label: "Notes" },
  { id: "mention", label: "Mentions" },
  { id: "reminder", label: "Reminders" },
  { id: "action", label: "Action items" },
  { id: "email", label: "Emails" },
];

const KIND_META: Record<
  TaskTimelineKind,
  { label: string; icon: typeof History; tone: string }
> = {
  created: {
    label: "Created",
    icon: PlusCircle,
    tone: "bg-emerald-50 text-emerald-700",
  },
  modified: {
    label: "Changed",
    icon: Pencil,
    tone: "bg-[#F3ECFB] text-[#5A32A3]",
  },
  status: {
    label: "Status",
    icon: RefreshCcw,
    tone: "bg-amber-50 text-amber-700",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  note: {
    label: "Note",
    icon: FileText,
    tone: "bg-sky-50 text-sky-700",
  },
  mention: {
    label: "Mention",
    icon: AtSign,
    tone: "bg-violet-50 text-violet-700",
  },
  reminder: {
    label: "Reminder",
    icon: Bell,
    tone: "bg-orange-50 text-orange-700",
  },
  action: {
    label: "Action item",
    icon: ListChecks,
    tone: "bg-slate-100 text-slate-700",
  },
  email: {
    label: "Email",
    icon: Mail,
    tone: "bg-blue-50 text-blue-700",
  },
};

export function TaskFullTimeline({ task }: { task: Task }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const events = useMemo(() => listTaskTimeline(task), [task]);
  const visible = events.filter((event) =>
    filter === "all" ? true : event.kind === filter,
  );

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-6">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Task timeline
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{task.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every create, field change, note, mention, reminder, action item, and
          related email on this task.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === item.id
                ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          No timeline events in this view yet.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-slate-200 pl-6">
          {visible.map((event) => (
            <TimelineRow key={event.id} event={event} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: TaskTimelineEvent }) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  return (
    <li className="relative pb-8">
      <span
        className={cn(
          "absolute top-0 -left-[31px] flex h-8 w-8 items-center justify-center rounded-full",
          meta.tone,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  meta.tone,
                )}
              >
                {meta.label}
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {event.headline}
              </h2>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3ECFB] text-[9px] font-bold text-[#5A32A3]">
                {initials(event.actor)}
              </span>
              <span>{event.actor}</span>
              <span aria-hidden>·</span>
              <time>{event.atLabel}</time>
            </div>
          </div>
        </div>
        {event.detail ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {event.detail}
          </p>
        ) : null}
        {event.mentions && event.mentions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {event.mentions.map((name) => (
              <span
                key={name}
                className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-800"
              >
                @{name}
              </span>
            ))}
          </div>
        ) : null}
        {event.changes && event.changes.length > 0 ? (
          <dl className="mt-3 space-y-1.5 rounded-lg bg-slate-50 px-3 py-2">
            {event.changes.map((change) => (
              <div
                key={`${event.id}-${change.field}`}
                className="grid grid-cols-[112px_minmax(0,1fr)] gap-2 text-xs"
              >
                <dt className="font-medium text-slate-500">{change.field}</dt>
                <dd className="min-w-0 text-slate-800">
                  <span className="text-slate-400">{change.from}</span>
                  <span className="mx-1.5 text-slate-300">→</span>
                  <span className="font-medium">{change.to}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </li>
  );
}
