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
import { fieldDiff, logCreate, logDelete, logEdit } from "@/lib/rules/audit";
import { isAssignedToCurrentUser } from "@/lib/activities/assigned-to-me";
import { getRulesActor } from "@/lib/rules/actor";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";

function meetingLeadLabel(relatedTo?: string, fallback = "Meeting") {
  const match = relatedTo?.match(/^Lead:\s*(.+)$/i);
  return match?.[1]?.trim() || fallback;
}

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
  key: "activities:meetings:list:v3",
  seed: cloneSeed,
});

export type MeetingScope = "all" | "mine" | "my-overdue";

export function isMeetingOverdue(
  meeting: Pick<Meeting, "status" | "startDateTime">,
  now = new Date(),
) {
  if (meeting.status !== "Scheduled") return false;
  const at = parseTaskDueDate(meeting.startDateTime);
  if (!at) return false;
  return at.getTime() < now.getTime();
}

export function meetingIsAssignedToMe(meeting: Pick<Meeting, "organizer" | "attendees">) {
  return isAssignedToCurrentUser(
    meeting.organizer,
    ...meeting.attendees.map((attendee) => attendee.name),
    ...meeting.attendees.map((attendee) => attendee.email),
  );
}

export function meetingMatchesScope(
  meeting: Pick<Meeting, "organizer" | "attendees" | "status" | "startDateTime">,
  scope: MeetingScope = "all",
) {
  if (scope === "all") return true;
  if (!meetingIsAssignedToMe(meeting)) return false;
  if (scope === "my-overdue") return isMeetingOverdue(meeting);
  return true;
}

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
  attendees?: Meeting["attendees"];
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
    attendees: input.attendees ?? [],
    organizer: input.organizer,
    status: input.status ?? "Scheduled",
    agenda: input.agenda,
    notes: input.notes,
  };
  saveMeetings([meeting, ...listMeetings()]);
  logCreate(
    "activities.meetings",
    meeting.organizer || getRulesActor().name,
    meeting.id,
    meetingLeadLabel(meeting.relatedTo, meeting.title),
  );
  emitLeadActivityChange();
  return meeting;
}

export function updateMeeting(
  id: string,
  patch: Partial<
    Pick<
      Meeting,
      | "title"
      | "status"
      | "notes"
      | "agenda"
      | "location"
      | "startDateTime"
      | "endDateTime"
      | "type"
      | "meetingLink"
      | "relatedTo"
      | "organizer"
      | "attendees"
    >
  >,
): Meeting | null {
  const items = listMeetings();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const current = items[index];
  const next: Meeting = { ...current, ...patch };
  const changes = fieldDiff(
    {
      title: current.title,
      status: current.status,
      notes: current.notes ?? "",
      agenda: current.agenda ?? "",
      location: current.location ?? "",
      startDateTime: current.startDateTime,
      endDateTime: current.endDateTime,
      type: current.type,
      meetingLink: current.meetingLink ?? "",
      relatedTo: current.relatedTo ?? "",
      organizer: current.organizer,
      attendees: current.attendees
        .map((a) => `${a.name}:${a.role ?? ""}`)
        .join(","),
    },
    {
      title: next.title,
      status: next.status,
      notes: next.notes ?? "",
      agenda: next.agenda ?? "",
      location: next.location ?? "",
      startDateTime: next.startDateTime,
      endDateTime: next.endDateTime,
      type: next.type,
      meetingLink: next.meetingLink ?? "",
      relatedTo: next.relatedTo ?? "",
      organizer: next.organizer,
      attendees: next.attendees
        .map((a) => `${a.name}:${a.role ?? ""}`)
        .join(","),
    },
  );
  if (!changes.length) return current;
  const copy = [...items];
  copy[index] = next;
  saveMeetings(copy);
  logEdit(
    "activities.meetings",
    getRulesActor().name || next.organizer,
    next.id,
    meetingLeadLabel(next.relatedTo, next.title),
    changes,
  );
  emitLeadActivityChange();
  return next;
}

export function findMeetingById(id: string) {
  const meeting = listMeetings().find((m) => m.id === id);
  return meeting ? { meeting } : null;
}

export function deleteMeeting(id: string): Meeting | null {
  const items = listMeetings();
  const found = items.find((m) => m.id === id) ?? null;
  if (!found) return null;
  saveMeetings(items.filter((m) => m.id !== id));
  logDelete(
    "activities.meetings",
    getRulesActor().name || found.organizer,
    found.id,
    meetingLeadLabel(found.relatedTo, found.title),
  );
  emitLeadActivityChange();
  return found;
}

function cloneMeeting(row: Meeting): Meeting {
  return { ...row, attendees: row.attendees.map((a) => ({ ...a })) };
}

export function upsertMeeting(row: Meeting) {
  const next = cloneMeeting(row);
  const items = listMeetings();
  const i = items.findIndex((m) => m.id === next.id);
  if (i >= 0) items[i] = next;
  else items.unshift(next);
  saveMeetings(items);
  emitLeadActivityChange();
  return next;
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmMeetings(remote: Meeting[]) {
  saveMeetings(remote.map(cloneMeeting));
  emitLeadActivityChange();
}

export function formatMeetingDateTime(d: Date): string {
  return formatRulesAt(d);
}
