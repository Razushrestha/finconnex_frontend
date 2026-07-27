"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar/types";
import { TYPE_META } from "@/lib/calendar/calendar-type-meta";
import { cn } from "@/lib/utils";

interface AddEventModalProps {
  /** Date (YYYY-MM-DD) to prefill the form with — e.g. the day the user was viewing. */
  defaultDate?: string;
  onClose: () => void;
  onCreate: (item: Omit<CalendarItem, "id">) => void;
}

export default function AddEventModal({
  defaultDate,
  onClose,
  onCreate,
}: AddEventModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarItemType>("Event");
  const [date, setDate] = useState(defaultDate ?? "");
  const [startTime, setStartTime] = useState("09:00");
  const [hasEnd, setHasEnd] = useState(true);
  const [endTime, setEndTime] = useState("09:30");
  const [owner, setOwner] = useState("");
  const [relatedTo, setRelatedTo] = useState("");

  const meta = TYPE_META[type];
  const canSave = Boolean(title.trim() && date && startTime && owner.trim());

  function handleClose() {
    onClose();
  }

  function handleSave() {
    if (!canSave) return;
    onCreate({
      title: title.trim(),
      type,
      start: `${date}T${startTime}`,
      end: hasEnd && endTime ? `${date}T${endTime}` : undefined,
      owner: owner.trim(),
      relatedTo: relatedTo.trim() ? relatedTo.trim() : undefined,
      colorClass: meta.dot,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-3",
            meta.soft,
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                meta.text,
              )}
            >
              New {meta.label.toLowerCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/60 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Discovery call: Anderson"
              autoFocus
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CalendarItemType)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {(Object.keys(TYPE_META) as CalendarItemType[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Start time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  End time
                </label>
                <label className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                  <input
                    type="checkbox"
                    checked={hasEnd}
                    onChange={(e) => setHasEnd(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-300 text-violet-600 focus:ring-violet-300"
                  />
                  Set
                </label>
              </div>
              <input
                type="time"
                value={endTime}
                disabled={!hasEnd}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Owner
            </label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Related to
            </label>
            <input
              value={relatedTo}
              onChange={(e) => setRelatedTo(e.target.value)}
              placeholder="e.g. Lead: Jane Doe"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors",
              meta.solid,
              "hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
