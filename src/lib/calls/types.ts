/** SRS §7.2 Calls */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

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
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export interface Call {
  id: string;
  subject: string;
  relatedTo?: string;
  contact?: string;
  callType: CallType;
  status: CallStatus;
  date: string;
  duration?: string;
  notes?: string;
  assignedTo: string;
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
        callType: "Outbound",
        status: "Scheduled",
        date: "22/07/2026 10:00 AM",
        assignedTo: "John Smith",
      },
      {
        id: "c2",
        subject: "Follow-up with Olivia Bennett",
        relatedTo: "Contact: Olivia Bennett",
        contact: "Olivia Bennett",
        callType: "Outbound",
        status: "Scheduled",
        date: "23/07/2026 02:00 PM",
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
        assignedTo: "John Smith",
      },
    ],
  },
  {
    id: "completed",
    title: "Completed",
    count: 3,
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
        notes: "Resolved billing question.",
        assignedTo: "Tejas Gokhe",
      },
      {
        id: "c4",
        subject: "Deal review: Greystone",
        relatedTo: "Deal: Greystone Realty",
        callType: "Outbound",
        status: "Completed",
        date: "19/07/2026 04:00 PM",
        duration: "32 min",
        assignedTo: "Roshna Abraham",
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
        notes: "Interested; follow up next week.",
        assignedTo: "Roshna Abraham",
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
        assignedTo: "Shiva Kadhka",
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
        assignedTo: "Tejas Gokhe",
      },
    ],
  },
];

/** Flat list for legacy list consumers */
export const calls: Call[] = callColumns.flatMap((c) => c.calls);
export const totalCallRecords = calls.length;
