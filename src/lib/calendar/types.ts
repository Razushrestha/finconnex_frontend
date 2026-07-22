/** SRS §7.8 Calendar — aggregated events */

export type CalendarItemType = "Event" | "Task" | "Meeting" | "Reminder";

export interface CalendarItem {
  id: string;
  title: string;
  type: CalendarItemType;
  start: string; // ISO-ish display
  end?: string;
  owner: string;
  relatedTo?: string;
  colorClass: string;
}

export const calendarItems: CalendarItem[] = [
  {
    id: "cal-1",
    title: "Discovery call — Anderson",
    type: "Event",
    start: "2026-07-22T10:00",
    end: "2026-07-22T10:30",
    owner: "John Smith",
    relatedTo: "Lead: William Anderson",
    colorClass: "bg-violet-500",
  },
  {
    id: "cal-2",
    title: "Demo environment setup",
    type: "Task",
    start: "2026-07-21T17:00",
    owner: "Roshna Abraham",
    relatedTo: "Task: T-004",
    colorClass: "bg-amber-500",
  },
  {
    id: "cal-3",
    title: "Project Kickoff Meeting",
    type: "Meeting",
    start: "2026-07-22T14:00",
    end: "2026-07-22T15:00",
    owner: "John Smith",
    relatedTo: "Company: Northwind Traders",
    colorClass: "bg-sky-500",
  },
  {
    id: "cal-4",
    title: "Follow up with Chloe",
    type: "Reminder",
    start: "2026-07-23T10:00",
    owner: "Shiva Kadhka",
    relatedTo: "Lead: Chloe Ramirez",
    colorClass: "bg-rose-500",
  },
  {
    id: "cal-5",
    title: "Proposal review",
    type: "Meeting",
    start: "2026-07-24T11:00",
    end: "2026-07-24T12:00",
    owner: "Tejas Gokhe",
    relatedTo: "Deal: Greystone Realty",
    colorClass: "bg-emerald-500",
  },
  {
    id: "cal-6",
    title: "Send welcome pack",
    type: "Task",
    start: "2026-07-22T16:00",
    owner: "John Smith",
    relatedTo: "Task: T-001",
    colorClass: "bg-amber-500",
  },
];
