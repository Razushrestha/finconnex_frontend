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
  title: string;
  count: number;
  badgeColorClass: string;
  meetings: Meeting[];
}

export const meetings: Meeting[] = [
  {
    id: "m1",
    title: "Project Kickoff Meeting",
    relatedTo: "Meta - Tronix",
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
    title: "Project Kickoff Meeting",
    relatedTo: "CRM",
    type: "Phone Call",
    startDateTime: "17/07/2026 05:00 PM",
    endDateTime: "17/07/2026 06:00 PM",
    meetingLink: "https://meet.google.com/abc-ccc",
    attendees: [
      { id: "u1", name: "Shiva Khadka", email: "shiva.khadka@example.com" },
      { id: "u2", name: "Shiva Rai", email: "shiva.rai@example.com" },
      { id: "u3", name: "John Cena", email: "john.cena@example.com" },
    ],
    organizer: "bishnu@nepatronix.com",
    status: "Rescheduled",
    agenda: "Review project milestones and timelines.",
  },
];

export const meetingColumns: MeetingColumn[] = [
  {
    id: "scheduled",
    title: "Scheduled",
    count: meetings.filter((m) => m.status === "Scheduled").length,
    badgeColorClass: "bg-sky-500 text-white",
    meetings: meetings.filter((m) => m.status === "Scheduled"),
  },
  {
    id: "in-progress",
    title: "In Progress",
    count: meetings.filter((m) => m.status === "In Progress").length,
    badgeColorClass: "bg-amber-500 text-white",
    meetings: meetings.filter((m) => m.status === "In Progress"),
  },
  {
    id: "completed",
    title: "Completed",
    count: meetings.filter((m) => m.status === "Completed").length,
    badgeColorClass: "bg-emerald-500 text-white",
    meetings: meetings.filter((m) => m.status === "Completed"),
  },
  {
    id: "cancelled",
    title: "Cancelled",
    count: meetings.filter((m) => m.status === "Cancelled").length,
    badgeColorClass: "bg-slate-400 text-white",
    meetings: meetings.filter((m) => m.status === "Cancelled"),
  },
];
