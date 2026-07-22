/** SRS §7.5 Meetings */

export type MeetingType =
  | "In-person"
  | "Video Call"
  | "Phone Call"
  | "Conference";

export type MeetingStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Rescheduled";

export const MEETING_TYPES: MeetingType[] = [
  "In-person",
  "Video Call",
  "Phone Call",
  "Conference",
];

export const MEETING_STATUSES: MeetingStatus[] = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rescheduled",
];

export interface Attendee {
  id: string;
  name: string;
  email: string;
}

export interface Meeting {
  id: string;
  title: string;
  relatedTo?: string;
  type: MeetingType;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  meetingLink?: string;
  attendees: Attendee[];
  organizer: string;
  status: MeetingStatus;
  agenda?: string;
  notes?: string;
}

export interface MeetingColumn {
  id: string;
  title: MeetingStatus;
  count: number;
  badgeColorClass: string;
  meetings: Meeting[];
}

export const meetings: Meeting[] = [
  {
    id: "m1",
    title: "Project Kickoff Meeting",
    relatedTo: "Company: Meta - Tronix",
    type: "Video Call",
    startDateTime: "17/07/2026 02:00 PM",
    endDateTime: "17/07/2026 03:00 PM",
    meetingLink: "https://meet.google.com/abc-xyz",
    attendees: [
      { id: "u1", name: "Shiva Khadka", email: "shiva.khadka@example.com" },
      { id: "u2", name: "Shiva Rai", email: "shiva.rai@example.com" },
      { id: "u3", name: "John Cena", email: "john.cena@example.com" },
    ],
    organizer: "bishnu@nepatronix.com",
    status: "Scheduled",
    agenda: "Review project milestones and timelines.",
  },
  {
    id: "m2",
    title: "CRM Walkthrough with Stakeholders",
    relatedTo: "Deal: Atlas CRM Rollout",
    type: "Phone Call",
    startDateTime: "17/07/2026 05:00 PM",
    endDateTime: "17/07/2026 06:00 PM",
    meetingLink: "https://meet.google.com/abc-ccc",
    attendees: [
      { id: "u1", name: "Shiva Khadka", email: "shiva.khadka@example.com" },
      { id: "u2", name: "Deepak Shrestha", email: "deepak@example.com" },
    ],
    organizer: "bishnu@nepatronix.com",
    status: "Rescheduled",
    agenda: "Demo forecasting module and collect feedback.",
  },
  {
    id: "m3",
    title: "Vendor Sync — Q3 Pricing",
    relatedTo: "Deal: Vendor Management",
    type: "Conference",
    startDateTime: "18/07/2026 10:00 AM",
    endDateTime: "18/07/2026 11:30 AM",
    location: "Conference Room B",
    attendees: [
      { id: "u4", name: "Tejas Gokhe", email: "tejas@example.com" },
      { id: "u5", name: "Roshna Abraham", email: "roshna@example.com" },
    ],
    organizer: "tejas@nepatronix.com",
    status: "In Progress",
    agenda: "Align on tiered pricing and SLAs.",
  },
  {
    id: "m4",
    title: "Onsite Discovery — Northwind",
    relatedTo: "Company: Northwind Traders",
    type: "In-person",
    startDateTime: "15/07/2026 09:00 AM",
    endDateTime: "15/07/2026 12:00 PM",
    location: "Northwind HQ, Floor 4",
    attendees: [
      { id: "u1", name: "Shiva Khadka", email: "shiva.khadka@example.com" },
      { id: "u6", name: "Olivia Bennett", email: "olivia@northwind.com" },
    ],
    organizer: "shiva@nepatronix.com",
    status: "Completed",
    agenda: "Map current workflows and integration needs.",
    notes: "Strong interest in calendar + reminders sync.",
  },
  {
    id: "m5",
    title: "Internal Retro — Sprint 12",
    relatedTo: "Company: Administration",
    type: "Video Call",
    startDateTime: "14/07/2026 04:00 PM",
    endDateTime: "14/07/2026 04:45 PM",
    meetingLink: "https://meet.google.com/retro-12",
    attendees: [
      { id: "u2", name: "Deepak Shrestha", email: "deepak@example.com" },
      { id: "u4", name: "Tejas Gokhe", email: "tejas@example.com" },
    ],
    organizer: "deepak@nepatronix.com",
    status: "Cancelled",
    agenda: "What went well / blockers / next sprint focus.",
  },
  {
    id: "m6",
    title: "Support Escalation Review",
    relatedTo: "Contact: Marcus Lin",
    type: "Phone Call",
    startDateTime: "19/07/2026 11:00 AM",
    endDateTime: "19/07/2026 11:30 AM",
    attendees: [
      { id: "u5", name: "Roshna Abraham", email: "roshna@example.com" },
    ],
    organizer: "roshna@nepatronix.com",
    status: "Scheduled",
    agenda: "Review open tickets and SLA breaches.",
  },
];

const COLUMN_COLORS: Record<MeetingStatus, string> = {
  Scheduled: "bg-sky-500 text-white",
  "In Progress": "bg-amber-500 text-white",
  Completed: "bg-emerald-500 text-white",
  Cancelled: "bg-slate-400 text-white",
  Rescheduled: "bg-violet-500 text-white",
};

export const meetingColumns: MeetingColumn[] = MEETING_STATUSES.map(
  (status) => {
    const items = meetings.filter((m) => m.status === status);
    return {
      id: status.toLowerCase().replace(/\s+/g, "-"),
      title: status,
      count: items.length,
      badgeColorClass: COLUMN_COLORS[status],
      meetings: items,
    };
  },
);
