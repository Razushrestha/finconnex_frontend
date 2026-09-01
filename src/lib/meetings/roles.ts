import type {
  Attendee,
  Meeting,
  MeetingAttendeeRole,
} from "@/lib/meetings/types";

function norm(value: string) {
  return value.trim().toLowerCase();
}

function relatedPersonName(relatedTo?: string) {
  if (!relatedTo) return "";
  const match = relatedTo.match(/^(Lead|Contact):\s*(.+)$/i);
  return match?.[2]?.trim() ?? "";
}

export function isMeetingHost(attendee: Attendee, meeting: Pick<Meeting, "organizer">) {
  const organizer = norm(meeting.organizer);
  return (
    norm(attendee.name) === organizer ||
    norm(attendee.email) === organizer ||
    attendee.role === "Host"
  );
}

export function resolveAttendeeRole(
  attendee: Attendee,
  meeting: Pick<Meeting, "organizer" | "relatedTo" | "attendees">,
): MeetingAttendeeRole {
  if (attendee.role) return attendee.role;
  if (isMeetingHost(attendee, meeting)) return "Host";
  const applicant = relatedPersonName(meeting.relatedTo);
  if (applicant && norm(attendee.name) === norm(applicant)) {
    return "Main Applicant";
  }
  return "Guest";
}

export function withResolvedRoles(
  meeting: Pick<Meeting, "organizer" | "relatedTo" | "attendees">,
): Attendee[] {
  const hostAlready = meeting.attendees.some(
    (attendee) => resolveAttendeeRole(attendee, meeting) === "Host",
  );
  return meeting.attendees.map((attendee, index) => {
    let role = resolveAttendeeRole(attendee, meeting);
    if (!hostAlready && index === 0) role = "Host";
    return { ...attendee, role };
  });
}
