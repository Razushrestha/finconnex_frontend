/** SRS §7.8 Calendar: aggregated events */

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

export const calendarItems: CalendarItem[] = [];
