/** SRS §7.2 Calls */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import type { TaskActionItem, TaskReminder } from "@/lib/tasks/types";
import type { ReminderRepeatRule } from "@/lib/tasks/repeat-reminder";

export const CALL_TYPES = [
  "Inbound",
  "Outbound",
  "Missed",
  "Voicemail",
] as const;
export type CallType = (typeof CALL_TYPES)[number];

export const CALL_STATUSES = [
  "Scheduled",
  "Completed",
  "No Answer",
  "Voicemail Left",
  "Cancelled",
  "Left Voicemail",
  "Busy",
  "Wrong Number",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Kanban stage names — use these in status pickers, not every outcome. */
export const CALL_STAGES = [
  "Scheduled",
  "Completed",
  "No Answer",
  "Voicemail Left",
  "Cancelled",
] as const satisfies readonly CallStatus[];
export type CallStage = (typeof CALL_STAGES)[number];

export const CALL_PURPOSES = [
  "Prospecting",
  "Administrative",
  "Negotiation",
  "Demo",
  "Project",
  "Support",
  "Follow-up",
] as const;
export type CallPurpose = (typeof CALL_PURPOSES)[number];

export interface NextStepTask {
  enabled: boolean;
  title: string;
  dueDate: string;
  assignee: string;
}

export interface CallFollowUp {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface CallRecording {
  durationSeconds: number;
  audioUrl?: string;
}

export interface CallAttachment {
  name: string;
  sizeLabel?: string;
  storageUrl?: string;
  contentType?: string;
}

export interface Call {
  id: string;
  subject: string;
  relatedTo?: string;
  contact?: string;
  callFor?: string;
  fromNumber?: string;
  callType: CallType;
  status: CallStatus;
  date: string;
  duration?: string;
  notes?: string;
  agenda?: string;
  purpose?: string;
  assignedTo: string;
  /** Team member who placed or answered the call — may differ from the owner. */
  calledBy?: string;
  recording?: CallRecording;
  nextStep?: NextStepTask;
  nextSteps?: CallFollowUp[];
  reminders?: TaskReminder[];
  reminderDate?: string;
  reminderRepeat?: ReminderRepeatRule;
  repeatRule?: ReminderRepeatRule;
  actionItems?: TaskActionItem[];
  createdBy?: string;
  createdOn?: string;
  modifiedBy?: string;
  modifiedOn?: string;
  attachments?: CallAttachment[];
  attachmentsCount?: number;
  outcome?: string;
}

export interface CallColumn {
  id: string;
  title: CallStatus;
  count: number;
  badgeColorClass: string;
  calls: Call[];
}

export const CALL_OWNERS = ACTIVITY_OWNERS;

export const callColumns: CallColumn[] = [
  {
    id: "scheduled",
    title: "Scheduled",
    count: 3,
    badgeColorClass: "bg-sky-500 text-white",
    calls: [],
  },
  {
    id: "completed",
    title: "Completed",
    count: 4,
    badgeColorClass: "bg-emerald-500 text-white",
    calls: [],
  },
  {
    id: "no-answer",
    title: "No Answer",
    count: 1,
    badgeColorClass: "bg-amber-500 text-white",
    calls: [],
  },
  {
    id: "voicemail-left",
    title: "Voicemail Left",
    count: 1,
    badgeColorClass: "bg-violet-500 text-white",
    calls: [],
  },
  {
    id: "cancelled",
    title: "Cancelled",
    count: 1,
    badgeColorClass: "bg-rose-500 text-white",
    calls: [],
  },
];

/** Flat list for legacy list consumers */
export const calls: Call[] = callColumns.flatMap((c) => c.calls);
export const totalCallRecords = calls.length;
