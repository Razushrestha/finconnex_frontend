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

export const MEETING_ATTENDEE_ROLES = [
  "Host",
  "Guest",
  "Main Applicant",
] as const;
export type MeetingAttendeeRole = (typeof MEETING_ATTENDEE_ROLES)[number];

export interface Attendee {
  id: string;
  name: string;
  email: string;
  role?: MeetingAttendeeRole;
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

export const meetings: Meeting[] = [];

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
