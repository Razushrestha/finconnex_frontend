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
  "Push",
  "SMS",
] as const;
export type NotificationMethod = (typeof NOTIFICATION_METHODS)[number];

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
    notificationMethod: "Push",
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
