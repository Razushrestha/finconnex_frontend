"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Meeting } from "@/lib/meetings/types";
import {
  formatMeetingDateTime,
  rescheduleMeeting,
} from "@/lib/meetings/store";
import { getRulesActor } from "@/lib/rules/actor";

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

function splitLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function joinLocal(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function guessTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}

export function RescheduleMeetingModal({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const currentStart = toLocalInput(meeting.startDateTime);
  const currentEnd = toLocalInput(meeting.endDateTime);
  const startParts = splitLocal(currentStart);
  const endParts = splitLocal(currentEnd);

  const [newDate, setNewDate] = useState(startParts.date);
  const [newStartTime, setNewStartTime] = useState(startParts.time);
  const [newEndTime, setNewEndTime] = useState(endParts.time);
  const [timeZone] = useState(guessTimeZone);
  const [reason, setReason] = useState("");
  const [notifyAttendees, setNotifyAttendees] = useState(true);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const start = joinLocal(newDate, newStartTime);
    const end = joinLocal(newDate, newEndTime);
    return {
      startDisplay: start ? fromLocalInput(start) : "",
      endDisplay: end ? fromLocalInput(end) : "",
      startRaw: start,
      endRaw: end,
    };
  }, [newDate, newStartTime, newEndTime]);

  function submit() {
    if (!preview.startRaw || !preview.endRaw) {
      toast.error("Choose a new date, start time, and end time");
      return;
    }
    const startAt = new Date(preview.startRaw);
    const endAt = new Date(preview.endRaw);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      toast.error("Invalid date or time");
      return;
    }
    if (endAt.getTime() <= startAt.getTime()) {
      toast.error("End time must be after start time");
      return;
    }
    setSaving(true);
    const next = rescheduleMeeting(meeting.id, {
      startDateTime: preview.startDisplay,
      endDateTime: preview.endDisplay,
      reason,
      notifyAttendees,
    });
    setSaving(false);
    if (!next) {
      toast.error("Could not reschedule meeting");
      return;
    }
    const actor = getRulesActor().name || "User";
    toast.success(`Meeting rescheduled by ${actor}`);
    if (notifyAttendees) {
      toast.message(
        `Notified ${meeting.attendees.length} attendee${meeting.attendees.length === 1 ? "" : "s"}`,
      );
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Reschedule Meeting
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Current date:</span>{" "}
            {meeting.startDateTime.split(" ")[0] ?? meeting.startDateTime}
          </p>
          <p>
            <span className="font-medium text-slate-800">Current time:</span>{" "}
            {meeting.startDateTime} – {meeting.endDateTime}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-[11px] font-medium text-slate-600">
            New date
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] outline-none focus:border-violet-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium text-slate-600">
              New start time
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] outline-none focus:border-violet-500"
              />
            </label>
            <label className="block text-[11px] font-medium text-slate-600">
              New end time
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] outline-none focus:border-violet-500"
              />
            </label>
          </div>
          <label className="block text-[11px] font-medium text-slate-600">
            Time zone
            <input
              readOnly
              value={timeZone}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[13px] text-slate-600"
            />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Reason for rescheduling{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this meeting moving?"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-[12px] text-slate-700">
            <span>Notify attendees</span>
            <input
              type="checkbox"
              checked={notifyAttendees}
              onChange={(e) => setNotifyAttendees(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            Reschedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
