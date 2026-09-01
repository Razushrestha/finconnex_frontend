"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MeetingHeader } from "@/components/activities/meetings/create/MeetingHeader";
import { toast } from "sonner";
import { MeetingType } from "@/lib/meetings/types";
import {
  MeetingFormCard,
  type MeetingLocationKind,
  type MeetingLocationMode,
} from "@/components/activities/meetings/create/MeetingFormCard";
import { AvailabilityCard } from "@/components/activities/meetings/create/AvailabilityCard";
import { PreparationTasksCard } from "@/components/activities/meetings/create/PreparationTasksCard";
import { createMeeting, formatMeetingDateTime } from "@/lib/meetings/store";
import {
  assignedCalendarMembers,
  availabilityRuleForDate,
  bookingLocationLabel,
  calendarDefaultHost,
  calendarTimezoneOption,
  customDaySlots,
  internalSlotsForDate,
  listActiveConsultations,
  type BookingPage,
} from "@/lib/booking/types";
import { isOnlineLocationKind } from "@/lib/booking/meeting-platforms";
import { asRelatedKind } from "@/lib/activities/create-defaults";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import { nowHHmm, parseStartHHmm } from "@/components/booking/CustomTimePicker";
import {
  defaultReminderRepeatRule,
  formatTaskRepeatSummary,
  listNextReminders,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatSlot(date: string, time: string, duration: string) {
  const startTime = parseStartHHmm(time) || time.split(" - ")[0]?.trim() || "10:00";
  const start = new Date(`${date}T${startTime}`);
  const minutes = Number.parseInt(duration, 10) || 30;
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return {
    start,
    end,
    startLabel: formatMeetingDateTime(start),
    endLabel: formatMeetingDateTime(end),
  };
}

function meetingTypeFromPage(page: BookingPage): MeetingType {
  if (page.meetingVia === "phone") return "Phone Call";
  if (page.meetingVia === "in_person") return "In-person";
  return "Video Call";
}

export default function ScheduleMeetingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [calendars, setCalendars] = useState<BookingPage[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [title, setTitle] = useState(params.get("title") ?? "");
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
  const [agenda, setAgenda] = useState("");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">(
    asRelatedKind(params.get("relatedKind") ?? undefined) ?? "",
  );
  const [relatedName, setRelatedName] = useState(
    params.get("relatedName") ?? "",
  );
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
  const hours = selectedCalendar
    ? availabilityRuleForDate(selectedCalendar, date)
    : undefined;

  useEffect(() => {
    const live = listActiveConsultations();
    setCalendars(live);
    const first = live[0];
    if (!first) return;
    const requested = params.get("title")?.trim();
    const match =
      live.find((page) => page.title === requested) ?? first;
    applyCalendar(match, { keepCustomTitle: Boolean(requested && requested !== match.title) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (whenMode === "custom") {
      if (!time) setTime(nowHHmm());
      return;
    }
    if (time && timeSlots.includes(time)) return;
    setTime(timeSlots[0] ?? "");
  }, [time, timeSlots, whenMode]);

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

  function handleSendInvites() {
    setAttempted(true);
    if (!title.trim()) {
      toast.error("Appointment title is required");
      return;
    }
    if (!relatedKind) {
      toast.error("Choose a related entity");
      return;
    }
    if (!relatedName.trim()) {
      toast.error("Choose or add a related record");
      return;
    }
    if (!date.trim() || !time.trim()) {
      toast.error("Date & time is required");
      return;
    }
    const first = formatSlot(date, time, duration);
    if (Number.isNaN(first.start.getTime())) {
      toast.error("Enter a valid date and time");
      return;
    }
    const host =
      teamMember !== "Calendar Default"
        ? teamMember
        : calendarDefaultHost(selectedCalendar);
    const starts =
      recurring && repeatRule.preset !== "none"
        ? listNextReminders(first.start, repeatRule, 24)
        : [first.start];
    if (starts.length === 0) {
      toast.error("No recurring times match this schedule");
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
    const minutes = Number.parseInt(duration, 10) || 30;
    const repeatNote =
      recurring && repeatRule.preset !== "none"
        ? formatTaskRepeatSummary(repeatRule)
        : "";
    const note = [agenda.trim(), repeatNote].filter(Boolean).join("\n");
    const relatedTo =
      relatedKind && relatedName.trim()
        ? `${relatedKind}: ${relatedName.trim()}`
        : undefined;
    let firstCreatedId = "";
    starts.forEach((startDate) => {
      const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
      const created = createMeeting({
        title: title.trim(),
        relatedTo,
        type:
          locationMode === "default" && selectedCalendar
            ? meetingTypeFromPage(selectedCalendar)
            : meetingType,
        startDateTime: formatMeetingDateTime(startDate),
        endDateTime: formatMeetingDateTime(endDate),
        organizer: host,
        location,
        meetingLink:
          locationMode === "default"
            ? selectedCalendar?.meetingViaDetail ||
              selectedCalendar?.videoLink ||
              undefined
            : isVideo
              ? meetingLink
              : undefined,
        notes: note || undefined,
        attendees: host
          ? [
              {
                id: "host",
                name: host,
                email: `${host.toLowerCase().replace(/\s+/g, ".")}@finconnex.com`,
                role: "Host",
              },
            ]
          : [],
      });
      if (!firstCreatedId) firstCreatedId = created.id;
    });
    toast.success(
      starts.length > 1
        ? `Invites sent for ${starts.length} occurrences`
        : "Invites sent",
    );
    router.push(`/activities/meetings/detail/${firstCreatedId}`);
  }

  const calendarOptions = useMemo(
    () => calendars.map((page) => ({ id: page.id, title: page.title })),
    [calendars],
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <MeetingHeader
        onCancel={() => router.push("/activities/meetings")}
        onSendInvites={handleSendInvites}
      />

      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-4 px-4 py-3 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6 2xl:px-8">
        <div>
          <MeetingFormCard
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
            agenda={agenda}
            onAgendaChange={setAgenda}
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

        <div className="space-y-6">
          <AvailabilityCard
            date={date}
            time={time}
            duration={duration}
            hours={hours}
            slots={timeSlots}
          />
          <PreparationTasksCard />
        </div>
      </div>
    </div>
  );
}
