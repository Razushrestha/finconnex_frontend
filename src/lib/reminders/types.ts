/** SRS §7.7 Reminders */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

export const REMINDER_TYPES = [
  "Task Due",
  "Meeting Start",
  "Follow-up",
  "Custom",
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const REMINDER_STATUSES = [
  "Pending",
  "Dismissed",
  "Snoozed",
  "Triggered",
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const NOTIFICATION_METHODS = [
  "In-app",
  "Email",
  "Web Push",
  "SMS",
] as const;
export type NotificationMethod = (typeof NOTIFICATION_METHODS)[number];

export const REMINDER_LEAD_TIMES = [
  "15 minutes before",
  "30 minutes before",
  "1 hour before",
  "1 day before",
] as const;
export type ReminderLeadTime = (typeof REMINDER_LEAD_TIMES)[number];

export interface ReminderScheduleEntry {
  id: string;
  date: string;
  time: string;
  leadTime: ReminderLeadTime;
  notificationMethod: NotificationMethod;
}

export function createReminderScheduleEntry(
  notificationMethod: NotificationMethod = "Web Push",
): ReminderScheduleEntry {
  return {
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: "",
    time: "",
    leadTime: REMINDER_LEAD_TIMES[0],
    notificationMethod,
  };
}

export interface Reminder {
  id: string;
  title: string;
  relatedTo?: string;
  dateTime: string;
  type: ReminderType;
  status: ReminderStatus;
  notificationMethod: NotificationMethod;
  owner: string;
}

export const REMINDER_OWNERS = ACTIVITY_OWNERS;

export interface ReminderFilters {
  statuses: ReminderStatus[];
  types: ReminderType[];
  methods: NotificationMethod[];
  owners: string[];
}

export const EMPTY_REMINDER_FILTERS: ReminderFilters = {
  statuses: [],
  types: [],
  methods: [],
  owners: [],
};

export function reminderMatchesFilters(
  reminder: Reminder,
  filters: ReminderFilters,
): boolean {
  if (filters.statuses.length && !filters.statuses.includes(reminder.status)) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(reminder.type)) {
    return false;
  }
  if (
    filters.methods.length &&
    !filters.methods.includes(reminder.notificationMethod)
  ) {
    return false;
  }
  if (filters.owners.length && !filters.owners.includes(reminder.owner)) {
    return false;
  }
  return true;
}

export const reminders: Reminder[] = [
  {
    id: "r1",
    title: "Demo environment setup due",
    relatedTo: "Task: T-004",
    dateTime: "21/07/2026 05:00 PM",
    type: "Task Due",
    status: "Pending",
    notificationMethod: "In-app",
    owner: "Roshna Abraham",
  },
  {
    id: "r2",
    title: "Kickoff meeting starts",
    relatedTo: "Meeting: Project Kickoff",
    dateTime: "22/07/2026 01:45 PM",
    type: "Meeting Start",
    status: "Pending",
    notificationMethod: "Web Push",
    owner: "John Smith",
  },
  {
    id: "r3",
    title: "Follow up with Chloe",
    relatedTo: "Lead: Chloe Ramirez",
    dateTime: "23/07/2026 10:00 AM",
    type: "Follow-up",
    status: "Snoozed",
    notificationMethod: "Email",
    owner: "Shiva Kadhka",
  },
  {
    id: "r4",
    title: "Send proposal reminder",
    relatedTo: "Deal: Greystone Realty",
    dateTime: "20/07/2026 09:00 AM",
    type: "Custom",
    status: "Triggered",
    notificationMethod: "SMS",
    owner: "Tejas Gokhe",
  },
  {
    id: "r5",
    title: "Old quota check",
    dateTime: "15/07/2026 12:00 PM",
    type: "Custom",
    status: "Dismissed",
    notificationMethod: "In-app",
    owner: "John Smith",
  },
];

export interface ReminderColumn {
  id: string;
  title: ReminderStatus;
  count: number;
  badgeColorClass: string;
  reminders: Reminder[];
}

export const reminderColumns: ReminderColumn[] = REMINDER_STATUSES.map(
  (status) => {
    const items = reminders.filter((r) => r.status === status);
    const colors: Record<ReminderStatus, string> = {
      Pending: "bg-sky-500 text-white",
      Dismissed: "bg-slate-400 text-white",
      Snoozed: "bg-amber-500 text-white",
      Triggered: "bg-emerald-500 text-white",
    };
    return {
      id: status.toLowerCase().replace(/\s+/g, "-"),
      title: status,
      count: items.length,
      badgeColorClass: colors[status],
      reminders: items,
    };
  },
);
