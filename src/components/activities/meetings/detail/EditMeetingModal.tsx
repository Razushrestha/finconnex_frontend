"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  MEETING_ATTENDEE_ROLES,
  MEETING_STATUSES,
  MEETING_TYPES,
  type Attendee,
  type Meeting,
  type MeetingAttendeeRole,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import { formatMeetingDateTime, updateMeeting } from "@/lib/meetings/store";
import { withResolvedRoles } from "@/lib/meetings/roles";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

function toLocalInput(display: string) {
  const match = display.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (match) {
    let hour = Number(match[4]);
    const minute = match[5];
    const ampm = match[6].toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${match[3]}-${match[2]}-${match[1]}T${String(hour).padStart(2, "0")}:${minute}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(display)) {
    return display.slice(0, 16);
  }
  return "";
}

function fromLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatMeetingDateTime(date);
}

export function EditMeetingModal({
  meeting,
  onClose,
  onSaved,
}: {
  meeting: Meeting;
  onClose: () => void;
  onSaved: (next: Meeting) => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [type, setType] = useState<MeetingType>(meeting.type);
  const [start, setStart] = useState(toLocalInput(meeting.startDateTime));
  const [end, setEnd] = useState(toLocalInput(meeting.endDateTime));
  const [location, setLocation] = useState(meeting.location ?? "");
  const [meetingLink, setMeetingLink] = useState(meeting.meetingLink ?? "");
  const [agenda, setAgenda] = useState(meeting.agenda ?? "");
  const [relatedTo, setRelatedTo] = useState(meeting.relatedTo ?? "");
  const [organizer, setOrganizer] = useState(meeting.organizer);
  const [attendees, setAttendees] = useState<Attendee[]>(() =>
    withResolvedRoles(meeting),
  );
  const [error, setError] = useState("");

  function setRole(id: string, role: MeetingAttendeeRole) {
    setAttendees((current) =>
      current.map((attendee) => {
        if (attendee.id === id) return { ...attendee, role };
        if (
          (role === "Host" || role === "Main Applicant") &&
          attendee.role === role
        ) {
          return { ...attendee, role: "Guest" };
        }
        return attendee;
      }),
    );
    if (role === "Host") {
      const host = attendees.find((attendee) => attendee.id === id);
      if (host) setOrganizer(host.name);
    }
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!start || !end) {
      setError("Start and end time are required");
      return;
    }
    const host = attendees.find((attendee) => attendee.role === "Host");
    const next = updateMeeting(meeting.id, {
      title: title.trim(),
      status,
      type,
      startDateTime: fromLocalInput(start),
      endDateTime: fromLocalInput(end),
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
      agenda: agenda.trim() || undefined,
      relatedTo: relatedTo.trim() || undefined,
      organizer: host?.name ?? organizer.trim(),
      attendees,
    });
    if (!next) {
      setError("Could not save this meeting");
      return;
    }
    toast.success("Meeting details updated");
    onSaved(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="edit-meeting-title"
        className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3
            id="edit-meeting-title"
            className="text-[15px] font-bold text-slate-900"
          >
            Edit Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-8rem)] space-y-3 overflow-auto px-5 py-5">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MeetingStatus)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
              >
                {MEETING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MeetingType)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
              >
                {MEETING_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
              />
            </Field>
            <Field label="End">
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
              />
            </Field>
          </div>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
            />
          </Field>
          <Field label="Meeting link">
            <input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
            />
          </Field>
          <Field label="Related to">
            <input
              value={relatedTo}
              onChange={(e) => setRelatedTo(e.target.value)}
              placeholder="Lead: Name"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
            />
          </Field>
          <Field label="Host / organizer">
            <select
              value={organizer}
              onChange={(e) => {
                setOrganizer(e.target.value);
                const match = attendees.find(
                  (attendee) => attendee.name === e.target.value,
                );
                if (match) setRole(match.id, "Host");
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]"
            >
              {ACTIVITY_OWNERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {attendees
                .filter((attendee) => !ACTIVITY_OWNERS.includes(attendee.name as (typeof ACTIVITY_OWNERS)[number]))
                .map((attendee) => (
                  <option key={attendee.id} value={attendee.name}>
                    {attendee.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Agenda">
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5A32A3]"
            />
          </Field>

          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Participants
            </p>
            <div className="space-y-2">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-800">
                      {attendee.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {attendee.email}
                    </p>
                  </div>
                  <select
                    value={attendee.role ?? "Guest"}
                    onChange={(e) =>
                      setRole(
                        attendee.id,
                        e.target.value as MeetingAttendeeRole,
                      )
                    }
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700 outline-none"
                  >
                    {MEETING_ATTENDEE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 rounded-lg bg-[#5A32A3] px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
