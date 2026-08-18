"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Bell, Check, ChevronDown, Mail, X } from "lucide-react";
import {
  REMINDER_NOTIFY_OPTIONS,
  REMINDER_RELATIVE_WHEN,
  REMINDER_REPEAT_OPTIONS,
  notifyToMethod,
  reminderNotify,
  type ReminderNotifyOption,
  type ReminderRelativeWhen,
  type ReminderRepeatType,
  type ReminderScheduleMode,
  type TaskReminder,
} from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

const RELATIVE_COUNTS = Array.from({ length: 31 }, (_, i) => i);
const ANCHORS = ["Due Date"] as const;

const fieldClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const radioClass =
  "h-4 w-4 border-slate-300 text-[#5A32A3] accent-[#5A32A3] focus:ring-[#5A32A3]";

interface ReminderModalProps {
  open: boolean;
  value: TaskReminder;
  dueDate?: string;
  onCancel: () => void;
  onDone: (reminder: TaskReminder) => void;
}

function dueDateToInput(value?: string): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function shiftFromDueDate(
  dueDate: string | undefined,
  count: number,
  when: ReminderRelativeWhen,
): string {
  const input = dueDateToInput(dueDate);
  if (!input) return "";
  const date = new Date(`${input}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + (when === "After" ? count : -count));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const NOTIFY_META: Record<
  ReminderNotifyOption,
  { hint: string; icon: typeof Mail }
> = {
  Email: { hint: "Send an email alert", icon: Mail },
  "Pop Up": { hint: "Show an in-app notification", icon: Bell },
  Both: { hint: "Email and in-app alert", icon: Bell },
};

export default function ReminderModal({
  open,
  value,
  dueDate,
  onCancel,
  onDone,
}: ReminderModalProps) {
  const radioName = useId();
  const listboxId = useId();
  const [draft, setDraft] = useState<TaskReminder>(value);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const notifyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...value,
      scheduleMode: value.scheduleMode ?? "onDate",
      date: value.date || dueDateToInput(dueDate),
      time: value.time || "13:00",
      relativeCount: value.relativeCount ?? 1,
      relativeWhen: value.relativeWhen ?? "Before",
      relativeOf: value.relativeOf ?? "Due Date",
      repeatType: value.repeatType ?? "None",
      notify: reminderNotify(value),
    });
    setNotifyOpen(false);
  }, [open, value, dueDate]);

  useEffect(() => {
    if (!notifyOpen) return;
    function handleClick(event: MouseEvent) {
      if (!notifyRef.current?.contains(event.target as Node)) {
        setNotifyOpen(false);
      }
    }
    function handleKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setNotifyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notifyOpen]);

  if (!open) return null;

  const mode: ReminderScheduleMode = draft.scheduleMode ?? "onDate";
  const notify = reminderNotify(draft);
  const NotifyIcon = NOTIFY_META[notify].icon;

  function update<K extends keyof TaskReminder>(key: K, val: TaskReminder[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }

  function selectNotify(option: ReminderNotifyOption) {
    update("notify", option);
    setNotifyOpen(false);
  }

  function handleNotifyKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!notifyOpen && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setActiveIndex(
        Math.max(0, REMINDER_NOTIFY_OPTIONS.indexOf(notify)),
      );
      setNotifyOpen(true);
      return;
    }
    if (!notifyOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % REMINDER_NOTIFY_OPTIONS.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (i) =>
          (i - 1 + REMINDER_NOTIFY_OPTIONS.length) %
          REMINDER_NOTIFY_OPTIONS.length,
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = REMINDER_NOTIFY_OPTIONS[activeIndex];
      if (option) selectNotify(option);
    }
  }

  function handleDone() {
    const nextNotify = reminderNotify(draft);
    const nextMode = draft.scheduleMode ?? "onDate";
    const relativeWhen = draft.relativeWhen ?? "Before";
    const relativeCount = draft.relativeCount ?? 1;
    onDone({
      ...draft,
      scheduleMode: nextMode,
      notify: nextNotify,
      notificationMethod: notifyToMethod(nextNotify),
      date:
        nextMode === "relative"
          ? shiftFromDueDate(dueDate, relativeCount, relativeWhen)
          : draft.date,
      relativeCount,
      relativeWhen,
      relativeOf: draft.relativeOf ?? "Due Date",
      repeatType: draft.repeatType ?? "None",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/25 px-4 pt-24 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Reminder</p>
            <p className="text-[11px] text-slate-400">
              Choose when and how to notify the owner
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="space-y-3">
            <label className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={radioName}
                className={radioClass}
                checked={mode === "onDate"}
                onChange={() => update("scheduleMode", "onDate")}
              />
              <span className="font-medium">On</span>
              <input
                type="date"
                disabled={mode !== "onDate"}
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
                className={fieldClass}
              />
              <span className="text-slate-500">at</span>
              <input
                type="time"
                disabled={mode !== "onDate"}
                value={draft.time}
                onChange={(e) => update("time", e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={radioName}
                className={radioClass}
                checked={mode === "relative"}
                onChange={() => update("scheduleMode", "relative")}
              />
              <span className="font-medium">On</span>
              <select
                disabled={mode !== "relative"}
                value={draft.relativeCount ?? 1}
                onChange={(e) =>
                  update("relativeCount", Number(e.target.value))
                }
                className={fieldClass}
              >
                {RELATIVE_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">Day(s)</span>
              <select
                disabled={mode !== "relative"}
                value={draft.relativeWhen ?? "Before"}
                onChange={(e) =>
                  update("relativeWhen", e.target.value as ReminderRelativeWhen)
                }
                className={fieldClass}
              >
                {REMINDER_RELATIVE_WHEN.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">of</span>
              <select
                disabled={mode !== "relative"}
                value={draft.relativeOf ?? "Due Date"}
                onChange={(e) =>
                  update("relativeOf", e.target.value as "Due Date")
                }
                className={fieldClass}
              >
                {ANCHORS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">at</span>
              <input
                type="time"
                disabled={mode !== "relative"}
                value={draft.time}
                onChange={(e) => update("time", e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <label className="text-sm font-medium text-slate-700">
              Repeat type
            </label>
            <select
              value={draft.repeatType ?? "None"}
              onChange={(e) =>
                update("repeatType", e.target.value as ReminderRepeatType)
              }
              className={`${fieldClass} min-w-[148px]`}
            >
              {REMINDER_REPEAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700">Notify</span>
            <div className="relative" ref={notifyRef}>
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(
                    Math.max(0, REMINDER_NOTIFY_OPTIONS.indexOf(notify)),
                  );
                  setNotifyOpen((openState) => !openState);
                }}
                onKeyDown={handleNotifyKey}
                aria-haspopup="listbox"
                aria-expanded={notifyOpen}
                aria-controls={listboxId}
                className={cn(
                  "inline-flex h-10 min-w-[176px] items-center justify-between gap-3 rounded-xl border bg-white px-3 text-sm font-medium outline-none transition-all",
                  notifyOpen
                    ? "border-[#5A32A3] text-slate-900 shadow-[0_0_0_3px_rgba(90,50,163,0.14)]"
                    : "border-slate-200 text-slate-800 hover:border-[#5A32A3]/35",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F3ECFB] text-[#5A32A3]">
                    <NotifyIcon className="h-3.5 w-3.5" />
                  </span>
                  {notify}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    notifyOpen && "rotate-180 text-[#5A32A3]",
                  )}
                />
              </button>
              {notifyOpen ? (
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label="Notify"
                  className="absolute right-0 z-20 mt-1.5 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
                >
                  {REMINDER_NOTIFY_OPTIONS.map((option, index) => {
                    const selected = option === notify;
                    const Icon = NOTIFY_META[option].icon;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectNotify(option)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                          selected
                            ? "bg-[#F3ECFB] text-[#5A32A3]"
                            : index === activeIndex
                              ? "bg-slate-50 text-slate-800"
                              : "text-slate-700 hover:bg-[#F3ECFB]/70",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            selected
                              ? "bg-white text-[#5A32A3]"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {option}
                          </span>
                          <span
                            className={cn(
                              "block text-[11px]",
                              selected ? "text-[#5A32A3]/70" : "text-slate-400",
                            )}
                          >
                            {NOTIFY_META[option].hint}
                          </span>
                        </span>
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0 text-[#5A32A3]" />
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-[#F3ECFB]/40 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="h-9 rounded-lg bg-[#5A32A3] px-4 text-sm font-semibold text-white shadow-sm shadow-[#5A32A3]/20 hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
