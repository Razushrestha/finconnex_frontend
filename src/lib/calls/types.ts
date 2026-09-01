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
    calls: [
      {
        id: "c1",
        // Spec §11 long-title example (~58 chars) — card truncates, full title in tooltip
        subject:
          "Follow up on refinancing application before rate lock expires",
        relatedTo: "Lead: William Anderson",
        contact: "William Anderson",
        callFor: "William Anderson",
        fromNumber: "+1 (415) 555-0142",
        callType: "Outbound",
        status: "Scheduled",
        date: "22/07/2026 10:00 AM",
        assignedTo: "John Smith",
        agenda: "Confirm remaining documents, rate-lock deadline, and next drawdown date.",
        purpose: "Follow-up",
        reminders: [
          {
            id: "cr-c1-1",
            type: "Follow-up",
            date: "2026-07-22",
            time: "09:45",
            leadTime: "15 minutes before",
            notificationMethod: "Email",
            scheduleMode: "onDate",
            relativeCount: 1,
            relativeWhen: "Before",
            relativeOf: "Due Date",
            repeatType: "None",
            notify: "Both",
          },
        ],
        nextSteps: [
          {
            id: "ns-c1-1",
            title: "Send follow-up email with revised proposal",
            dueDate: "Overdue (Yesterday)",
            completed: true,
          },
          {
            id: "ns-c1-2",
            title: "Schedule touchpoint call if no reply",
            dueDate: "Due Oct 27",
            completed: false,
          },
        ],
      },
      {
        id: "c2",
        subject: "Follow-up with Olivia Bennett",
        relatedTo: "Contact: Olivia Bennett",
        contact: "Olivia Bennett",
        callType: "Outbound",
        status: "Scheduled",
        date: "23/07/2026 02:00 PM",
        fromNumber: "+1 (415) 555-0198",
        assignedTo: "Shiva Kadhka",
      },
      {
        // Amber card seed: due today, nothing broken (Lead: Jennifer Adams)
        id: "c9",
        subject: "Call client",
        relatedTo: "Lead: Jennifer Adams",
        contact: "Jennifer Adams",
        callType: "Outbound",
        status: "Scheduled",
        date: "23/07/2026 05:00 PM",
        fromNumber: "+1 (415) 555-0100",
        assignedTo: "John Smith",
      },
    ],
  },
  {
    id: "completed",
    title: "Completed",
    count: 4,
    badgeColorClass: "bg-emerald-500 text-white",
    calls: [
      {
        id: "c3",
        subject: "Inbound support: Contoso",
        relatedTo: "Company: Contoso Ltd.",
        contact: "Marcus Lin",
        callType: "Inbound",
        status: "Completed",
        date: "20/07/2026 11:30 AM",
        duration: "18 min",
        fromNumber: "+1 (628) 555-0177",
        notes: "Resolved billing question.",
        assignedTo: "Tejas Gokhe",
        calledBy: "Tejas Gokhe",
        recording: { durationSeconds: 1080 },
      },
      {
        id: "c10",
        subject: "Billing follow-up: Contoso",
        relatedTo: "Company: Contoso Ltd.",
        contact: "Marcus Lin",
        callType: "Outbound",
        status: "Completed",
        date: "12/07/2026 03:15 PM",
        duration: "9 min",
        fromNumber: "+1 (628) 555-0177",
        notes: "Confirmed last invoice and payment date.",
        assignedTo: "Tejas Gokhe",
        calledBy: "John Smith",
        recording: { durationSeconds: 540 },
      },
      {
        id: "c4",
        subject: "Deal review: Greystone",
        relatedTo: "Deal: Greystone Realty",
        callType: "Outbound",
        status: "Completed",
        date: "19/07/2026 04:00 PM",
        duration: "32 min",
        fromNumber: "+1 (415) 555-0142",
        assignedTo: "Roshna Abraham",
        calledBy: "Roshna Abraham",
        recording: { durationSeconds: 1920 },
      },
      {
        // Empty-summary + last-activity seed (Lead: Katherina Brooks)
        id: "c8",
        subject: "Intro call: Blue Sky Media",
        relatedTo: "Lead: Katherina Brooks",
        contact: "Katherina Brooks",
        callType: "Outbound",
        status: "Completed",
        date: "22/07/2026 03:00 PM",
        duration: "22 min",
        fromNumber: "+1 (415) 555-0142",
        notes: "Interested; follow up next week.",
        assignedTo: "Roshna Abraham",
        calledBy: "John Smith",
        recording: { durationSeconds: 1320 },
      },
    ],
  },
  {
    id: "no-answer",
    title: "No Answer",
    count: 1,
    badgeColorClass: "bg-amber-500 text-white",
    calls: [
      {
        id: "c5",
        subject: "Cold outreach: Riverstone",
        relatedTo: "Lead: Chloe Ramirez",
        callType: "Outbound",
        status: "No Answer",
        date: "21/07/2026 09:15 AM",
        fromNumber: "+1 (415) 555-0142",
        assignedTo: "John Smith",
      },
    ],
  },
  {
    id: "voicemail-left",
    title: "Voicemail Left",
    count: 1,
    badgeColorClass: "bg-violet-500 text-white",
    calls: [
      {
        id: "c6",
        subject: "Voicemail: Priya Nair",
        relatedTo: "Contact: Priya Nair",
        contact: "Priya Nair",
        callType: "Voicemail",
        status: "Voicemail Left",
        date: "20/07/2026 03:45 PM",
        duration: "0:42",
        fromNumber: "+1 (415) 555-0142",
        assignedTo: "Shiva Kadhka",
        calledBy: "Shiva Kadhka",
        recording: { durationSeconds: 42 },
      },
    ],
  },
  {
    id: "cancelled",
    title: "Cancelled",
    count: 1,
    badgeColorClass: "bg-rose-500 text-white",
    calls: [
      {
        id: "c7",
        subject: "Cancelled sync: Bright Bay",
        relatedTo: "Company: Bright Bay Co.",
        callType: "Outbound",
        status: "Cancelled",
        date: "18/07/2026 01:00 PM",
        fromNumber: "+1 (415) 555-0100",
        assignedTo: "Tejas Gokhe",
      },
    ],
  },
];

/** Flat list for legacy list consumers */
export const calls: Call[] = callColumns.flatMap((c) => c.calls);
export const totalCallRecords = calls.length;
