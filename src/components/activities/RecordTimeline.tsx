"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  FileText,
  History,
  ListChecks,
  Mail,
  Paperclip,
  Pencil,
  Phone,
  PlusCircle,
  RefreshCcw,
  Video,
} from "lucide-react";
import { initials } from "@/lib/activities/shared";
import type {
  RecordTimelineEvent,
  RecordTimelineKind,
} from "@/lib/activities/record-timeline";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  RecordTimelineKind,
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
  note: {
    label: "Note",
    icon: FileText,
    tone: "bg-sky-50 text-sky-700",
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
  attachment: {
    label: "Attachment",
    icon: Paperclip,
    tone: "bg-lime-50 text-lime-700",
  },
  email: {
    label: "Email",
    icon: Mail,
    tone: "bg-blue-50 text-blue-700",
  },
  call: {
    label: "Call",
    icon: Phone,
    tone: "bg-violet-50 text-violet-700",
  },
  meeting: {
    label: "Meeting",
    icon: Video,
    tone: "bg-indigo-50 text-indigo-700",
  },
};

export function RecordTimeline({
  eyebrow,
  title,
  description,
  events,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  events: RecordTimelineEvent[];
}) {
  const filters = useMemo(() => {
    const kinds = Array.from(new Set(events.map((event) => event.kind)));
    return [
      { id: "all" as const, label: "All" },
      ...kinds.map((kind) => ({ id: kind, label: KIND_META[kind].label })),
    ];
  }, [events]);
  const [filter, setFilter] = useState<"all" | RecordTimelineKind>("all");
  const visible = events.filter((event) =>
    filter === "all" ? true : event.kind === filter,
  );

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-6">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      {filters.length > 2 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((item) => (
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
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          No timeline events in this view yet.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-slate-200 pl-6">
          {visible.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="relative pb-8">
                <span
                  className={cn(
                    "absolute top-0 -left-[31px] flex h-8 w-8 items-center justify-center rounded-full",
                    meta.tone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        meta.tone,
                      )}
                    >
                      {meta.label}
                    </span>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {item.headline}
                    </h2>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3ECFB] text-[9px] font-bold text-[#5A32A3]">
                      {initials(item.actor)}
                    </span>
                    <span>{item.actor}</span>
                    <span aria-hidden>·</span>
                    <time>{item.atLabel}</time>
                  </div>
                  {item.detail ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
