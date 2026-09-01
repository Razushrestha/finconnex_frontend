"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MeetingFormCard,
  MeetingRelatedFields,
  type MeetingLocationKind,
  type MeetingLocationMode,
} from "@/components/activities/meetings/create/MeetingFormCard";
import {
  MeetingGuestPicker,
  type MeetingGuest,
} from "@/components/activities/meetings/create/MeetingGuestPicker";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { nowHHmm, parseStartHHmm } from "@/components/booking/CustomTimePicker";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import { isOnlineLocationKind } from "@/lib/booking/meeting-platforms";
import {
  assignedCalendarMembers,
  bookingLocationLabel,
  calendarDefaultHost,
  calendarTimezoneOption,
  customDaySlots,
  internalSlotsForDate,
  listActiveConsultations,
  type BookingPage,
} from "@/lib/booking/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import type { LeadCardData } from "@/lib/leads/types";
import {
  createMeeting,
  findMeetingById,
  formatMeetingDateTime,
  updateMeeting,
} from "@/lib/meetings/store";
import { MeetingType } from "@/lib/meetings/types";
import {
  defaultReminderRepeatRule,
  formatTaskRepeatSummary,
  listNextReminders,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";

type MeetingDraft = {
  id: string;
  title: string;
  subtitle?: string;
  at: Date;
  owner: string;
};

const PURPLE = "#5A32A3";

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toDateIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toHHmm(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function meetingTypeFromPage(page: BookingPage): MeetingType {
  if (page.meetingVia === "phone") return "Phone Call";
  if (page.meetingVia === "in_person") return "In-person";
  return "Video Call";
}

function formatSlot(date: string, time: string, duration: string) {
  const startTime =
    parseStartHHmm(time) || time.split(" - ")[0]?.trim() || "10:00";
  const start = new Date(`${date}T${startTime}`);
  const minutes = Number.parseInt(duration, 10) || 30;
  return { start, minutes };
}

export function LeadScheduleMeetingModal({
  open,
  card,
  onClose,
  onSaved,
  editId = null,
  draft = null,
}: {
  open: boolean;
  card: LeadCardData;
  onClose: () => void;
  onSaved?: (replacedSeedId?: string) => void;
  editId?: string | null;
  draft?: MeetingDraft | null;
}) {
  const [calendars, setCalendars] = useState<BookingPage[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [title, setTitle] = useState("");
  const [teamMember, setTeamMember] = useState("Calendar Default");
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30 min");
  const [whenMode, setWhenMode] = useState<"default" | "custom">("default");
  const [recurring, setRecurring] = useState(false);
  const [repeatRule, setRepeatRule] = useState<ReminderRepeatRule>({
    ...defaultReminderRepeatRule,
  });
  const [timezone, setTimezone] = useState("GMT+10:00 Australia/Sydney (AEST)");
  const [meetingType, setMeetingType] = useState<MeetingType>("Video Call");
  const [meetingLink, setMeetingLink] = useState("");
  const [locationMode, setLocationMode] =
    useState<MeetingLocationMode>("default");
  const [locationKind, setLocationKind] =
    useState<MeetingLocationKind>("Office address");
  const [locationDetail, setLocationDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("Lead");
  const [relatedName, setRelatedName] = useState(card.name);
  const [guests, setGuests] = useState<MeetingGuest[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);

  const selectedCalendar = calendars.find((page) => page.id === calendarId);
  const teamMembers = assignedCalendarMembers(selectedCalendar);
  const durationMinutes = Number.parseInt(duration, 10) || 30;
  const timeSlots =
    whenMode === "custom"
      ? customDaySlots(durationMinutes)
      : selectedCalendar
        ? internalSlotsForDate(selectedCalendar, date)
        : [];
  const calendarOptions = useMemo(
    () => calendars.map((page) => ({ id: page.id, title: page.title })),
    [calendars],
  );
  const editing = Boolean(editId || draft);

  function applyCalendar(
    page: BookingPage,
    opts?: { keepCustomTitle?: boolean },
  ) {
    setCalendarId(page.id);
    if (!opts?.keepCustomTitle) setTitle(page.title);
    setTeamMember("Calendar Default");
    setDuration(`${page.durationMinutes} min`);
    setTimezone(calendarTimezoneOption(page.timezone));
    setMeetingType(meetingTypeFromPage(page));
    setMeetingLink(page.meetingViaDetail || page.videoLink || "");
    setLocationMode("default");
    const slots = internalSlotsForDate(page, date);
    setTime(slots[0] ?? "");
  }

  useEffect(() => {
    if (!open) return;
    setError("");
    setAttempted(false);
    setSaving(false);
    setWhenMode("default");
    setRecurring(false);
    setRepeatRule({ ...defaultReminderRepeatRule });
    setRelatedKind("Lead");
    setRelatedName(card.name);
    setGuests([]);
    setNotes("");

    const live = listActiveConsultations();
    setCalendars(live);
    const first = live[0];
    if (first) applyCalendar(first);

    if (editId) {
      const meeting = findMeetingById(editId)?.meeting;
      if (meeting) {
        const at = parseFlexibleDate(meeting.startDateTime);
        const ends = parseFlexibleDate(meeting.endDateTime);
        setTitle(meeting.title);
        setNotes(meeting.notes ?? "");
        if (at) {
          setDate(toDateIso(at));
          setTime(toHHmm(at));
          setWhenMode("custom");
          if (ends) {
            const mins = Math.max(
              1,
              Math.round((ends.getTime() - at.getTime()) / 60000),
            );
            setDuration(`${mins} min`);
          }
        }
        if (meeting.organizer) setTeamMember(meeting.organizer);
        setGuests(
          (meeting.attendees ?? [])
            .filter((attendee) => attendee.role !== "Host")
            .map((attendee) => ({
              id: attendee.id,
              name: attendee.name,
              email: attendee.email,
            })),
        );
        return;
      }
    }

    if (draft) {
      setTitle(draft.title);
      setDate(toDateIso(draft.at));
      setTime(toHHmm(draft.at));
      setWhenMode("custom");
      if (draft.owner) setTeamMember(draft.owner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.name, editId, draft?.id]);

  useEffect(() => {
    if (!open) return;
    if (whenMode === "custom") {
      if (!time) setTime(nowHHmm());
      return;
    }
    if (time && timeSlots.includes(time)) return;
    setTime(timeSlots[0] ?? "");
  }, [open, time, timeSlots, whenMode]);

  function handleSave() {
    setAttempted(true);
    if (!title.trim()) {
      setError("Appointment title is required");
      return;
    }
    if (!relatedKind) {
      setError("Choose a related entity");
      return;
    }
    if (!relatedName.trim()) {
      setError("Choose or add a related record");
      return;
    }
    if (!date.trim() || !time.trim()) {
      setError("Date & time is required");
      return;
    }
    const host =
      teamMember !== "Calendar Default"
        ? teamMember
        : calendarDefaultHost(selectedCalendar);
    const first = formatSlot(date, time, duration);
    if (Number.isNaN(first.start.getTime())) {
      setError("Enter a valid date and time");
      return;
    }
    const starts =
      recurring && repeatRule.preset !== "none"
        ? listNextReminders(first.start, repeatRule, 24)
        : [first.start];
    if (starts.length === 0) {
      setError("No recurring times match this schedule");
      return;
    }

    const isVideo = isOnlineLocationKind(locationKind);
    const location =
      locationMode === "default"
        ? selectedCalendar
          ? bookingLocationLabel(selectedCalendar)
          : "Calendar default"
        : locationKind === "Office address" || locationKind === "Custom"
          ? locationDetail || locationKind
          : locationKind;
    const minutes = first.minutes;
    const repeatNote =
      recurring && repeatRule.preset !== "none"
        ? formatTaskRepeatSummary(repeatRule)
        : "";
    const relatedTo = `${relatedKind}: ${relatedName.trim()}`;
    const note = [notes.trim(), repeatNote].filter(Boolean).join("\n");
    const meetingLinkValue =
      locationMode === "default"
        ? selectedCalendar?.meetingViaDetail ||
          selectedCalendar?.videoLink ||
          undefined
        : isVideo
          ? meetingLink
          : undefined;
    const type =
      locationMode === "default" && selectedCalendar
        ? meetingTypeFromPage(selectedCalendar)
        : meetingType;

    const attendees = [
      ...(host
        ? [
            {
              id: "host",
              name: host,
              email: `${host.toLowerCase().replace(/\s+/g, ".")}@finconnex.com`,
              role: "Host" as const,
            },
          ]
        : []),
      ...guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        role: "Guest" as const,
      })),
    ];

    setSaving(true);
    setError("");
    try {
      if (editId && findMeetingById(editId)) {
        const startDate = starts[0];
        const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
        updateMeeting(editId, {
          title: title.trim(),
          relatedTo,
          type,
          startDateTime: formatMeetingDateTime(startDate),
          endDateTime: formatMeetingDateTime(endDate),
          organizer: host,
          location,
          meetingLink: meetingLinkValue,
          notes: note || undefined,
          attendees,
        });
      } else {
        starts.forEach((startDate) => {
          const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
          createMeeting({
            title: title.trim(),
            relatedTo,
            type,
            startDateTime: formatMeetingDateTime(startDate),
            endDateTime: formatMeetingDateTime(endDate),
            organizer: host,
            location,
            meetingLink: meetingLinkValue,
            attendees,
            notes: note || undefined,
          });
        });
      }
      emitLeadActivityChange();
      toast.success(
        starts.length > 1
          ? `Meeting saved for ${starts.length} occurrences`
          : editing
            ? "Meeting updated"
            : "Meeting scheduled",
      );
      onSaved?.(draft?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <DialogTitle className="text-[16px] font-semibold text-slate-900">
            {editing ? "Edit Meeting" : "Create Meeting"}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Schedule a meeting for {card.name} without leaving this lead.
        </DialogDescription>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,34%)]">
            <div className="px-6 py-5 lg:border-r lg:border-slate-100">
              <MeetingFormCard
                compact
                hideRelated
                hideAgenda
                calendars={calendarOptions}
                calendarId={calendarId}
                onCalendarChange={(id) => {
                  const page = calendars.find((item) => item.id === id);
                  if (page) applyCalendar(page);
                }}
                title={title}
                onTitleChange={setTitle}
                titleError={
                  attempted && !title.trim()
                    ? "Appointment title is required"
                    : undefined
                }
                dateTimeError={
                  attempted && (!date.trim() || !time.trim())
                    ? "Date & time is required"
                    : undefined
                }
                teamMember={teamMember}
                onTeamMemberChange={setTeamMember}
                teamMembers={teamMembers}
                date={date}
                onDateChange={setDate}
                time={time}
                onTimeChange={setTime}
                timeSlots={timeSlots}
                duration={duration}
                onDurationChange={setDuration}
                whenMode={whenMode}
                onWhenModeChange={setWhenMode}
                meetingType={meetingType}
                onMeetingTypeChange={setMeetingType}
                meetingLink={meetingLink}
                onMeetingLinkChange={setMeetingLink}
                locationMode={locationMode}
                onLocationModeChange={setLocationMode}
                locationKind={locationKind}
                onLocationKindChange={setLocationKind}
                locationDetail={locationDetail}
                onLocationDetailChange={setLocationDetail}
                defaultLocationLabel={
                  selectedCalendar
                    ? bookingLocationLabel(selectedCalendar)
                    : undefined
                }
                agenda=""
                onAgendaChange={() => {}}
                timezone={timezone}
                onTimezoneChange={setTimezone}
                relatedKind={relatedKind}
                onRelatedKindChange={setRelatedKind}
                relatedName={relatedName}
                onRelatedNameChange={setRelatedName}
                recurring={recurring}
                onRecurringChange={setRecurring}
                repeatRule={repeatRule}
                onRepeatRuleChange={setRepeatRule}
              />
            </div>
            <div className="space-y-5 border-t border-slate-100 bg-[#F8F9FB] px-6 py-5 lg:border-t-0">
              <MeetingRelatedFields
                relatedKind={relatedKind}
                onRelatedKindChange={setRelatedKind}
                relatedName={relatedName}
                onRelatedNameChange={setRelatedName}
              />
              <MeetingGuestPicker guests={guests} onChange={setGuests} />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Internal note
                </label>
                <MentionNotesTextarea
                  rows={5}
                  value={notes}
                  onChange={setNotes}
                  placeholder="Internal notes… Type @ to mention someone."
                />
              </div>
            </div>
          </div>
        </div>
        {error ? (
          <p className="shrink-0 px-5 pb-1 text-[12px] text-rose-600">{error}</p>
        ) : null}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: PURPLE }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
