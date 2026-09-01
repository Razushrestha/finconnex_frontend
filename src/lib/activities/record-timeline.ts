import type { Attachment } from "@/lib/attachments/types";
import type { Call } from "@/lib/calls/types";
import type { Email } from "@/lib/emails/types";
import type { Meeting } from "@/lib/meetings/types";
import type { Message } from "@/lib/messages/types";
import type { Note } from "@/lib/notes/types";
import type { Reminder } from "@/lib/reminders/types";

export type RecordTimelineKind =
  | "created"
  | "modified"
  | "status"
  | "note"
  | "reminder"
  | "action"
  | "attachment"
  | "email"
  | "call"
  | "meeting";

export interface RecordTimelineEvent {
  id: string;
  kind: RecordTimelineKind;
  headline: string;
  detail?: string;
  actor: string;
  atLabel: string;
}

function event(
  partial: RecordTimelineEvent,
): RecordTimelineEvent {
  return partial;
}

export function listCallTimeline(call: Call): RecordTimelineEvent[] {
  const actor = call.createdBy ?? call.assignedTo;
  const events: RecordTimelineEvent[] = [
    event({
      id: `${call.id}-created`,
      kind: "created",
      headline: "Call created",
      detail: call.subject,
      actor,
      atLabel: call.createdOn ?? call.date,
    }),
    event({
      id: `${call.id}-status`,
      kind: "status",
      headline: `Status: ${call.status}`,
      detail: call.outcome || call.purpose,
      actor: call.modifiedBy ?? actor,
      atLabel: call.modifiedOn ?? call.date,
    }),
  ];
  if (call.notes) {
    events.push({
      id: `${call.id}-notes`,
      kind: "note",
      headline: "Notes added",
      detail: call.notes,
      actor,
      atLabel: call.modifiedOn ?? call.date,
    });
  }
  for (const reminder of call.reminders ?? []) {
    events.push({
      id: reminder.id,
      kind: "reminder",
      headline: reminder.type,
      detail: [reminder.date, reminder.time, reminder.leadTime]
        .filter(Boolean)
        .join(" · "),
      actor,
      atLabel: reminder.date || call.date,
    });
  }
  for (const step of call.nextSteps ?? []) {
    events.push({
      id: step.id,
      kind: "action",
      headline: step.completed ? "Next step completed" : "Next step added",
      detail: step.title,
      actor,
      atLabel: step.dueDate || call.date,
    });
  }
  if (call.recording) {
    events.push({
      id: `${call.id}-rec`,
      kind: "call",
      headline: "Recording available",
      detail: `${call.recording.durationSeconds}s`,
      actor: call.calledBy ?? actor,
      atLabel: call.date,
    });
  }
  for (const file of call.attachments ?? []) {
    events.push({
      id: `${call.id}-${file.name}`,
      kind: "attachment",
      headline: "Attachment added",
      detail: file.name,
      actor,
      atLabel: call.date,
    });
  }
  return events;
}

export function listMeetingTimeline(meeting: Meeting): RecordTimelineEvent[] {
  const events: RecordTimelineEvent[] = [
    event({
      id: `${meeting.id}-created`,
      kind: "created",
      headline: "Meeting scheduled",
      detail: meeting.title,
      actor: meeting.organizer,
      atLabel: meeting.startDateTime,
    }),
    event({
      id: `${meeting.id}-status`,
      kind: "status",
      headline: `Status: ${meeting.status}`,
      detail: `${meeting.type} · ${meeting.startDateTime}`,
      actor: meeting.organizer,
      atLabel: meeting.startDateTime,
    }),
  ];
  if (meeting.agenda) {
    events.push({
      id: `${meeting.id}-agenda`,
      kind: "note",
      headline: "Agenda set",
      detail: meeting.agenda,
      actor: meeting.organizer,
      atLabel: meeting.startDateTime,
    });
  }
  if (meeting.notes) {
    events.push({
      id: `${meeting.id}-notes`,
      kind: "note",
      headline: "Meeting notes",
      detail: meeting.notes,
      actor: meeting.organizer,
      atLabel: meeting.endDateTime,
    });
  }
  if (meeting.attendees.length) {
    events.push({
      id: `${meeting.id}-attendees`,
      kind: "meeting",
      headline: `${meeting.attendees.length} attendees`,
      detail: meeting.attendees.map((a) => a.name).join(", "),
      actor: meeting.organizer,
      atLabel: meeting.startDateTime,
    });
  }
  return events;
}

export function listNoteTimeline(note: Note): RecordTimelineEvent[] {
  const events: RecordTimelineEvent[] = [
    event({
      id: `${note.id}-created`,
      kind: "created",
      headline: "Note created",
      detail: note.title || note.body,
      actor: note.createdBy,
      atLabel: note.createdAt,
    }),
  ];
  if (note.updatedAt) {
    events.push({
      id: `${note.id}-modified`,
      kind: "modified",
      headline: "Note updated",
      detail: note.body,
      actor: note.updatedBy ?? note.createdBy,
      atLabel: note.updatedAt,
    });
  }
  if (note.isPinned) {
    events.push({
      id: `${note.id}-pin`,
      kind: "status",
      headline: "Pinned",
      actor: note.createdBy,
      atLabel: note.updatedAt ?? note.createdAt,
    });
  }
  return events;
}

export function listReminderTimeline(reminder: Reminder): RecordTimelineEvent[] {
  return [
    event({
      id: `${reminder.id}-created`,
      kind: "created",
      headline: "Reminder created",
      detail: reminder.title,
      actor: reminder.owner,
      atLabel: reminder.dateTime,
    }),
    event({
      id: `${reminder.id}-status`,
      kind: "status",
      headline: `Status: ${reminder.status}`,
      detail: `${reminder.type} · ${reminder.notificationMethod}`,
      actor: reminder.owner,
      atLabel: reminder.dateTime,
    }),
  ];
}

export function listMessageTimeline(message: Message): RecordTimelineEvent[] {
  return [
    event({
      id: `${message.id}-created`,
      kind: "created",
      headline: "Message created",
      detail: message.subject,
      actor: message.from,
      atLabel: message.sentDate ?? "Draft",
    }),
    event({
      id: `${message.id}-status`,
      kind: "status",
      headline: `Status: ${message.status}`,
      detail: `${message.type} · to ${message.to}`,
      actor: message.from,
      atLabel: message.sentDate ?? "Draft",
    }),
  ];
}

export function listEmailTimeline(email: Email): RecordTimelineEvent[] {
  const events: RecordTimelineEvent[] = [
    event({
      id: `${email.id}-created`,
      kind: "created",
      headline: "Email created",
      detail: email.subject,
      actor: email.from,
      atLabel: email.sentDate ?? "Draft",
    }),
  ];
  if (email.sentDate) {
    events.push({
      id: `${email.id}-sent`,
      kind: "email",
      headline: "Email sent",
      detail: email.to.join(", "),
      actor: email.from,
      atLabel: email.sentDate,
    });
  }
  if (email.openedDate) {
    events.push({
      id: `${email.id}-opened`,
      kind: "status",
      headline: "Email opened",
      actor: email.to[0] ?? email.from,
      atLabel: email.openedDate,
    });
  }
  return events;
}

export function listAttachmentsTimeline(
  files: Attachment[],
): RecordTimelineEvent[] {
  return files.map((file) =>
    event({
      id: file.id,
      kind: "attachment",
      headline: file.fileName,
      detail: [file.kind, file.relatedTo, file.sizeLabel]
        .filter(Boolean)
        .join(" · "),
      actor: file.uploadedBy,
      atLabel: file.uploadedAt,
    }),
  );
}
