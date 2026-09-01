import {
  reminderColumns as seedColumns,
  REMINDER_STATUSES,
  type Reminder,
  type ReminderColumn,
  type ReminderStatus,
} from "@/lib/reminders/types";

const STORE_KEY = "activities:reminders:v1";

const COLUMN_COLORS: Record<ReminderStatus, string> = {
  Pending: "bg-sky-500 text-white",
  Dismissed: "bg-slate-400 text-white",
  Snoozed: "bg-amber-500 text-white",
  Triggered: "bg-emerald-500 text-white",
};

function seedReminders(): Reminder[] {
  return seedColumns.flatMap((col) =>
    col.reminders.map((row) => ({ ...row, status: col.title })),
  );
}

function readStore(): Reminder[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Reminder[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: Reminder[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listReminders(): Reminder[] {
  return readStore() ?? seedReminders();
}

export function saveReminders(items: Reminder[]) {
  writeStore(items);
}

export function upsertReminder(row: Reminder) {
  const items = listReminders();
  const i = items.findIndex((r) => r.id === row.id);
  if (i >= 0) items[i] = { ...row };
  else items.unshift({ ...row });
  saveReminders(items);
  return row;
}

export function deleteReminder(id: string) {
  saveReminders(listReminders().filter((r) => r.id !== id));
}

export function replaceCrmReminders(remote: Reminder[]) {
  saveReminders(remote.map((row) => ({ ...row })));
}

export function listReminderColumns(): ReminderColumn[] {
  const items = listReminders();
  return REMINDER_STATUSES.map((status) => {
    const reminders = items.filter((r) => r.status === status);
    return {
      id: status.toLowerCase().replace(/\s+/g, "-"),
      title: status,
      count: reminders.length,
      badgeColorClass: COLUMN_COLORS[status],
      reminders,
    };
  });
}
