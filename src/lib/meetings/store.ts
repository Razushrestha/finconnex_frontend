/** Live meetings store (session-backed). */

import {
  meetings as SEED_MEETINGS,
  MEETING_STATUSES,
  type Meeting,
  type MeetingColumn,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

const COLUMN_COLORS: Record<MeetingStatus, string> = {
  Scheduled: "bg-sky-500 text-white",
  "In Progress": "bg-amber-500 text-white",
  Completed: "bg-emerald-500 text-white",
  Cancelled: "bg-slate-400 text-white",
  Rescheduled: "bg-violet-500 text-white",
};

function cloneSeed(): Meeting[] {
  return SEED_MEETINGS.map((m) => ({
    ...m,
    attendees: m.attendees.map((a) => ({ ...a })),
  }));
}

function toColumns(items: Meeting[]): MeetingColumn[] {
  return MEETING_STATUSES.map((status) => {
    const meetings = items.filter((m) => m.status === status);
    return {
      id: status.toLowerCase().replace(/\s+/g, "-"),
      title: status,
      count: meetings.length,
      badgeColorClass: COLUMN_COLORS[status],
      meetings,
    };
  });
}

const store = createBoardStore({
  key: "activities:meetings:list:v1",
  seed: cloneSeed,
});

export function listMeetings(): Meeting[] {
  return store.list();
}

export function saveMeetings(items: Meeting[]) {
  store.save(items);
}

export function listMeetingColumns(): MeetingColumn[] {
  return toColumns(listMeetings());
}

export function saveMeetingColumns(cols: MeetingColumn[]) {
  saveMeetings(cols.flatMap((c) => c.meetings.map((m) => ({ ...m, status: c.title }))));
}

export function createMeeting(input: {
  title: string;
  relatedTo?: string;
  type: MeetingType;
  startDateTime: string;
  endDateTime: string;
  status?: MeetingStatus;
  organizer: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
}): Meeting {
  const meeting: Meeting = {
    id: newRulesId("meet"),
    title: input.title.trim(),
    relatedTo: input.relatedTo,
    type: input.type,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    location: input.location,
    meetingLink: input.meetingLink,
    attendees: [],
    organizer: input.organizer,
    status: input.status ?? "Scheduled",
    agenda: input.agenda,
    notes: input.notes,
  };
  saveMeetings([meeting, ...listMeetings()]);
  emitLeadActivityChange();
  return meeting;
}

export function findMeetingById(id: string) {
  const meeting = listMeetings().find((m) => m.id === id);
  return meeting ? { meeting } : null;
}

export function formatMeetingDateTime(d: Date): string {
  return formatRulesAt(d);
}
