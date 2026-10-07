"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Plus, X } from "lucide-react";
import {
  NOTIFICATION_METHODS,
  type NotificationMethod,
} from "@/lib/reminders/types";
import {
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { isUuid } from "@/lib/activity-timeline/auth";
import { ReminderCustomFrequencyFields } from "@/components/activities/tasks/ReminderCustomFrequencyFields";
import {
  availableReminderFrequencies,
  defaultReminderRepeatRule,
  formatReminderOccurrence,
  formatTaskRepeatSummary,
  listReminderOccurrences,
  ruleFromLegacyRepeatType,
  toLegacyRepeatType,
  type LegacyRepeatType,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { reminderFrequencyLabel } from "@/lib/tasks/types";

interface Assignee {
  id: string;
  name: string;
}

interface ReminderSettingsSidebarProps {
  notificationMethod: NotificationMethod;
  onNotificationMethodChange: (method: NotificationMethod) => void;
  frequencyRule: ReminderRepeatRule;
  onFrequencyRuleChange: (rule: ReminderRepeatRule) => void;
  /** First scheduled reminder — used as the series start. */
  reminderStart: Date | null;
  /** End/anchor date for “until” (e.g. related task due, or last schedule). */
  reminderDue: Date | null;
  leadTime: string;
  onLeadTimeChange: (val: string) => void;
  assignees: Assignee[];
  onRemoveAssignee: (id: string) => void;
  onAddAssignee: (assignee: Assignee) => void;
}

export const ReminderSettingsSidebar: React.FC<
  ReminderSettingsSidebarProps
> = ({
  notificationMethod,
  onNotificationMethodChange,
  frequencyRule,
  onFrequencyRuleChange,
  reminderStart,
  reminderDue,
  leadTime,
  onLeadTimeChange,
  assignees,
  onRemoveAssignee,
  onAddAssignee,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [freqOpen, setFreqOpen] = useState(false);
  const [draftRule, setDraftRule] = useState<ReminderRepeatRule>(frequencyRule);
  const [teamUsers, setTeamUsers] = useState<AssignableOwner[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (!cancelled) setTeamUsers(rows.filter((row) => isUuid(row.id)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (freqOpen) setDraftRule(frequencyRule);
  }, [freqOpen, frequencyRule]);

  const filteredUsers = teamUsers.filter(
    (user) =>
      !assignees.some((a) => a.id === user.id) &&
      (user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())),
  );

  const repeatType = toLegacyRepeatType(frequencyRule);
  const frequencySummary =
    frequencyRule.preset === "none"
      ? "Does not repeat"
      : frequencyRule.preset === "custom"
        ? formatTaskRepeatSummary(frequencyRule) || "Custom"
        : reminderFrequencyLabel(repeatType);

  const frequencyOptions = useMemo(
    () => availableReminderFrequencies(reminderStart, reminderDue),
    [reminderStart, reminderDue],
  );

  const draftType = toLegacyRepeatType(draftRule);
  const upcoming = useMemo(() => {
    if (!reminderStart || draftRule.preset === "none") return [];
    return listReminderOccurrences(reminderStart, reminderDue, draftRule);
  }, [reminderStart, reminderDue, draftRule]);

  function openFrequencyEditor() {
    setDraftRule(
      frequencyRule.preset === "none"
        ? { ...defaultReminderRepeatRule }
        : { ...frequencyRule, weekdays: [...frequencyRule.weekdays] },
    );
    setFreqOpen(true);
  }

  function handleFrequencyDone() {
    onFrequencyRuleChange(
      draftType === "None"
        ? { ...defaultReminderRepeatRule }
        : draftRule.preset === "none"
          ? ruleFromLegacyRepeatType(draftType, draftRule)
          : draftRule,
    );
    setFreqOpen(false);
  }

  function handleFrequencyCancel() {
    setFreqOpen(false);
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-white p-5 text-card-foreground shadow-sm">
      <div className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Delivery Method
        </h3>
        <div className="space-y-2">
          {NOTIFICATION_METHODS.map((method) => {
            const isSelected = notificationMethod === method;
            return (
              <label
                key={method}
                onClick={() => onNotificationMethodChange(method)}
                className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-input/30 text-muted-foreground hover:bg-input/60"
                }`}
              >
                <input
                  type="radio"
                  name="notificationMethod"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-0.5 text-primary focus:ring-ring"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    {method === "In-app" ? "In-App Notification" : method}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {method === "In-app" && "Standard dashboard alert"}
                    {method === "Email" && "Sent to assigned user"}
                    {method === "SMS" && "Requires mobile number"}
                    {method === "Web Push" && "Browser push notification"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Frequency
        </label>
        <button
          type="button"
          onClick={openFrequencyEditor}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-input/50 px-3 text-left text-xs text-foreground hover:bg-input"
        >
          <span className="truncate font-medium">{frequencySummary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Lead Time
        </label>
        <select
          value={leadTime}
          onChange={(e) => onLeadTimeChange(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-border bg-input/50 px-3 py-2.5 text-xs text-foreground hover:bg-input focus:outline-none"
        >
          <option value="15 minutes before">15 minutes before</option>
          <option value="30 minutes before">30 minutes before</option>
          <option value="1 hour before">1 hour before</option>
          <option value="1 day before">1 day before</option>
        </select>
      </div>

      <div className="relative space-y-2" ref={containerRef}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Assign To
          </label>
        </div>

        <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-border bg-input/50 p-2">
          {assignees.map((assignee) => (
            <span
              key={assignee.id}
              className="inline-flex items-center space-x-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {assignee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <span>{assignee.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAssignee(assignee.id)}
                className="ml-1 font-bold text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}

          {!isOpen ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              <span>Search users...</span>
            </button>
          ) : (
            <div className="flex min-w-[120px] flex-1 items-center rounded border border-border bg-input/80 px-1">
              <Search className="mr-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user..."
                className="w-full bg-transparent py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute right-0 left-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    onAddAssignee({ id: user.id, name: user.name });
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between border-b border-border/50 px-3 py-2 text-xs last:border-none hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-semibold text-foreground">
                    {user.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                {teamUsers.length
                  ? "No users found"
                  : "Loading workspace members…"}
              </div>
            )}
          </div>
        )}
      </div>

      {freqOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center bg-slate-900/25 px-4 pt-20 backdrop-blur-[2px]"
          onClick={handleFrequencyCancel}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  Reminder frequency
                </p>
                <p className="text-[11px] text-slate-400">
                  How often this reminder repeats
                </p>
              </div>
              <button
                type="button"
                onClick={handleFrequencyCancel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close frequency"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">Frequency</p>
                <select
                  value={draftType}
                  onChange={(e) =>
                    setDraftRule(
                      ruleFromLegacyRepeatType(
                        e.target.value as LegacyRepeatType,
                        draftRule,
                      ),
                    )
                  }
                  className="h-10 min-w-[148px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "None"
                        ? "Does not repeat"
                        : reminderFrequencyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              {draftType === "Custom" ? (
                <div className="rounded-xl border border-[#5A32A3]/15 bg-[#F8F3FC] p-3">
                  <ReminderCustomFrequencyFields
                    value={draftRule}
                    start={reminderStart}
                    due={reminderDue}
                    dueOptionLabel="Reminder date"
                    onChange={setDraftRule}
                  />
                </div>
              ) : null}

              {upcoming.length > 1 ? (
                <ul className="space-y-1 rounded-xl border border-[#5A32A3]/10 bg-[#F8F3FC] px-3 py-2">
                  {upcoming.slice(0, 8).map((date, index) => {
                    const isFinal =
                      index === Math.min(upcoming.length, 8) - 1 &&
                      upcoming.length <= 8 &&
                      draftRule.preset === "custom" &&
                      draftRule.ends !== "never";
                    return (
                      <li
                        key={date.toISOString()}
                        className="text-[12px] text-slate-600"
                      >
                        {formatReminderOccurrence(date)}
                        {isFinal ? " · final reminder" : ""}
                      </li>
                    );
                  })}
                  {upcoming.length > 8 ? (
                    <li className="text-[11px] text-slate-400">
                      and {upcoming.length - 8} more, then stop
                    </li>
                  ) : (
                    <li className="text-[11px] text-slate-400">
                      {draftRule.preset === "custom" &&
                      draftRule.ends === "never"
                        ? "Continues until completed"
                        : "Then stop, or sooner if completed"}
                    </li>
                  )}
                </ul>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-[#F3ECFB]/40 px-5 py-3">
              <button
                type="button"
                onClick={handleFrequencyCancel}
                className="h-9 rounded-lg border border-[#5A32A3]/25 bg-white px-4 text-sm font-medium text-[#5A32A3] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFrequencyDone}
                className="h-9 rounded-lg bg-[#5A32A3] px-4 text-sm font-semibold text-white shadow-sm shadow-[#5A32A3]/20 hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
