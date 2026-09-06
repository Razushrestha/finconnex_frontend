"use client";

import { useEffect, useState } from "react";
import { ReminderSettingsCard } from "@/components/activities/tasks/ReminderSettingsCard";
import type { DocumentRequest } from "@/lib/documents/requests/types";
import { upsertDocumentRequest } from "@/lib/documents/requests/types";
import { appendTimeline, nowStamp } from "@/lib/documents/requests/pack";
import {
  formatRequestDateTime,
  formatRequestRepeat,
  parseNotifyBy,
  parseRequestRepeat,
  parseStoredDateTime,
  toDatetimeLocalValue,
} from "@/components/documents/requests/RequestScheduleCard";
import type { NotificationMethod } from "@/lib/reminders/types";
import type { ReminderRepeatRule } from "@/lib/tasks/repeat-reminder";

export function EditRemindersModal({
  request,
  onClose,
  onSaved,
}: {
  request: DocumentRequest;
  onClose: () => void;
  onSaved: (next: DocumentRequest) => void;
}) {
  const due = parseStoredDateTime(request.dueDate);
  const existing = parseStoredDateTime(request.reminderDate);
  const [reminderDate, setReminderDate] = useState(
    existing ? toDatetimeLocalValue(existing) : "",
  );
  const [reminderRepeat, setReminderRepeat] = useState(
    parseRequestRepeat(request.repeat),
  );
  const [notifyBy, setNotifyBy] = useState<NotificationMethod[]>(
    parseNotifyBy(request.notifyBy),
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleNotify(method: NotificationMethod) {
    setNotifyBy((prev) =>
      prev.includes(method)
        ? prev.filter((item) => item !== method)
        : [...prev, method],
    );
  }

  function apply(next: {
    reminderDate: string;
    notifyBy: NotificationMethod[];
    repeat: ReminderRepeatRule;
  }) {
    const channels = next.notifyBy.length ? next.notifyBy : ["Email"];
    const saved = {
      ...request,
      reminderDate: next.reminderDate.trim()
        ? formatRequestDateTime(next.reminderDate)
        : undefined,
      repeat:
        next.repeat.preset !== "none"
          ? formatRequestRepeat(next.repeat)
          : undefined,
      notifyBy: channels,
      lastUpdated: nowStamp(),
      timeline: appendTimeline(request, {
        at: nowStamp(),
        by: request.requestedBy,
        label: "Reminder updated",
        detail: [
          next.reminderDate.trim()
            ? formatRequestDateTime(next.reminderDate)
            : "No reminder date",
          next.repeat.preset !== "none"
            ? formatRequestRepeat(next.repeat)
            : "Once",
          `Notify by ${channels.join(", ")}`,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    };
    upsertDocumentRequest(saved);
    onSaved(saved);
  }

  return (
    <ReminderSettingsCard
      enabled
      autoOpen
      variant="modal"
      reminderDate={reminderDate}
      onReminderDateChange={setReminderDate}
      min={toDatetimeLocalValue(new Date())}
      max={due ? toDatetimeLocalValue(due) : undefined}
      notifyBy={notifyBy}
      onToggleNotify={toggleNotify}
      repeat={reminderRepeat}
      onRepeatChange={setReminderRepeat}
      due={due}
      onEnabledChange={() => {}}
      onApply={apply}
      onDismiss={onClose}
    />
  );
}
