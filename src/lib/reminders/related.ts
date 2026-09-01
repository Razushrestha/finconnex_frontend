import { isUuid } from "@/lib/activity-timeline/auth";
import type { Reminder } from "@/lib/reminders/types";
import {
  createTaskReminder,
  type TaskReminder,
} from "@/lib/tasks/types";

export type ReminderParentType = "Task" | "Call" | "Meeting";

export function reminderDueAt(reminder: TaskReminder): string {
  if (reminder.date && reminder.time) {
    const parsed = Date.parse(`${reminder.date}T${reminder.time}`);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    return `${reminder.date}T${reminder.time}:00`;
  }
  return new Date().toISOString();
}

export function reminderToTaskReminder(row: Reminder): TaskReminder {
  const parsed = row.dateTime.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  let date = "";
  let time = "";
  if (parsed) {
    const day = parsed[1].padStart(2, "0");
    const month = parsed[2].padStart(2, "0");
    date = `${parsed[3]}-${month}-${day}`;
    if (parsed[4]) {
      let hour = Number(parsed[4]);
      const minute = parsed[5] ?? "00";
      const meridiem = parsed[6]?.toUpperCase();
      if (meridiem === "PM" && hour < 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
      time = `${String(hour).padStart(2, "0")}:${minute}`;
    }
  }
  return createTaskReminder({
    id: row.id,
    type: row.type,
    date,
    time: time || "09:00",
    notificationMethod: row.notificationMethod,
    notify: row.notificationMethod === "Email" ? "Email" : "Pop Up",
  });
}

export function canUseRelatedReminders(parentId: string): boolean {
  return isUuid(parentId);
}
