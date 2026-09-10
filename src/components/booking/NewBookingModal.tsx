"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Info,
  Link2,
  MapPin,
  Plus,
  Users,
  X,
} from "lucide-react";
import { isUuid } from "@/lib/activity-timeline/auth";
import { listAllContacts, createQuickContact } from "@/lib/contacts/store";
import { formatMeetingDateTime } from "@/lib/meetings/store";
import { createCrmMeeting } from "@/lib/meetings/api";
import {
  type AppointmentChannel,
  type AppointmentStatus,
  type DashboardAppointment,
} from "@/lib/booking/dashboard";
import {
  calendlyCrmLinkFromRelated,
  calendlyEventTypeToBookingPage,
  createCalendlyBooking,
  linkCalendlyMeetingCrm,
  listCalendlyAvailableTimes,
  listCalendlyBusyTimes,
  listCalendlyEventTypes,
  listCalendlyHosts,
  localHHmmFromIso,
  newCalendlyIdempotencyKey,
  resolveCalendlyEventType,
  type CalendlyHost,
} from "@/lib/booking/calendly-api";
import {
  assignedCalendarMembers,
  bookingLocationLabel,
  calendarDefaultHost,
  calendarTimezoneOption,
  customDaySlots,
  formatSlotRange,
  internalSlotsForDate,
  type BookingPage,
} from "@/lib/booking/types";
import { DEFAULT_TIMEZONE } from "@/lib/booking/timezones";
import { DateTimeSection } from "@/components/booking/DateTimeSection";
import {
  nowHHmm,
  parseStartHHmm,
} from "@/components/booking/CustomTimePicker";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import type { MeetingAttendeeRole, MeetingType } from "@/lib/meetings/types";
import { TaskRepeatBlock } from "@/components/activities/tasks/ReminderSettingsCard";
import {
  defaultReminderRepeatRule,
  formatTaskRepeatSummary,
  listNextReminders,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { cn } from "@/lib/utils";
import {
  initials,
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";

const LOCATIONS = ["Zoom", "Google Meet", "Phone", "Full address"] as const;
type LocationKind = (typeof LOCATIONS)[number];

const ROLE_STYLE: Record<MeetingAttendeeRole, string> = {
  Host: "bg-[#F3ECFB] text-[#5A32A3]",
  Guest: "bg-slate-100 text-slate-600",
  "Main Applicant": "bg-emerald-50 text-emerald-700",
};

function toLocalDateValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function prettyDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function slotStart(slot: string) {
  const parsed = parseStartHHmm(slot);
  return parsed || "10:00";
}

function slotDurationMinutes(slot: string) {
  const [left, right] = slot.split("–").map((part) => part.trim());
  if (!left || !right) return 30;
  const toMin = (label: string) => {
    const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
    if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  return Math.max(15, toMin(right) - toMin(left));
}

export function NewBookingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (row?: DashboardAppointment) => void;
}) {
  const [recordTick, setRecordTick] = useState(0);
  const contacts = useMemo(() => listAllContacts(), [open, recordTick]);
  const [calendars, setCalendars] = useState<BookingPage[]>([]);
  const now = new Date();
  const [calendarId, setCalendarId] = useState("");
  const [title, setTitle] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [consultantId, setConsultantId] = useState("calendar-default");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [whenMode, setWhenMode] = useState<"default" | "custom">("default");
  const [customDuration, setCustomDuration] = useState(30);
  const [date, setDate] = useState(toLocalDateValue(now));
  const [slot, setSlot] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [repeatRule, setRepeatRule] = useState<ReminderRepeatRule>({
    ...defaultReminderRepeatRule,
  });
  const [locationMode, setLocationMode] = useState<"default" | "custom">("default");
  const [locationKind, setLocationKind] = useState<LocationKind>("Zoom");
  const [meetingLink, setMeetingLink] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState(contacts[0]?.id ?? "");
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [status, setStatus] = useState<AppointmentStatus>("Confirmed");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [relatedRecordId, setRelatedRecordId] = useState("");
  const [calendlyHosts, setCalendlyHosts] = useState<CalendlyHost[]>([]);
  const [providerSlots, setProviderSlots] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void Promise.all([
      listCalendlyHosts({ active: true }).catch(() => [] as CalendlyHost[]),
      listCalendlyEventTypes().catch(() => []),
    ]).then(([hosts, types]) => {
      if (!alive) return;
      setCalendlyHosts(hosts);
      const hostName = (id: string) =>
        hosts.find((host) => host.id === id)?.name ?? "";
      setCalendars(
        types.map((item) =>
          calendlyEventTypeToBookingPage(item, hostName(item.hostId)),
        ),
      );
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const calendar = calendars.find((item) => item.id === calendarId) ?? calendars[0];
  const teamMembers = [
    { id: "calendar-default", name: "Calendar Default" },
    ...assignedCalendarMembers(calendar).map((name) => ({
      id: name,
      name,
    })),
    ...calendlyHosts
      .filter((host) => !assignedCalendarMembers(calendar).includes(host.name))
      .map((host) => ({ id: host.id, name: host.name })),
  ];
  const slotDuration = customDuration;
  const localSlots = useMemo(() => {
    if (whenMode === "custom") {
      return customDaySlots(slotDuration).map((start) =>
        formatSlotRange(start, slotDuration),
      );
    }
    if (!calendar) return [];
    return internalSlotsForDate(calendar, date).map((start) =>
      formatSlotRange(start, slotDuration),
    );
  }, [calendar, date, slotDuration, whenMode]);
  const slots = whenMode === "custom" ? localSlots : (providerSlots ?? localSlots);

  useEffect(() => {
    if (!open || !calendar || whenMode === "custom" || !date) {
      setProviderSlots(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const hostId = isUuid(consultantId) ? consultantId : calendar.calendlyHostId;
        const eventType = await resolveCalendlyEventType(calendar, hostId);
        if (!eventType || !isUuid(eventType.id)) {
          if (alive) setProviderSlots(null);
          return;
        }
        const from = new Date(`${date}T00:00:00`);
        const to = new Date(`${date}T23:59:59`);
        const times = await listCalendlyAvailableTimes({
          eventTypeId: eventType.id,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const duration = eventType.durationMinutes || slotDuration;
        let mapped = times.map((row) =>
          formatSlotRange(localHHmmFromIso(row.startTime), duration),
        );
        if (hostId && isUuid(hostId)) {
          try {
            const busy = await listCalendlyBusyTimes(hostId, {
              from: from.toISOString(),
              to: to.toISOString(),
            });
            mapped = mapped.filter((label) => {
              const hhmm = slotStart(label);
              return !busy.some((block) => {
                const start = localHHmmFromIso(block.startTime);
                const end = localHHmmFromIso(block.endTime);
                return hhmm >= start && hhmm < end;
              });
            });
          } catch {
            /* available-times is already provider-authoritative */
          }
        }
        if (alive) setProviderSlots(mapped);
      } catch {
        if (alive) setProviderSlots(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, calendar, date, whenMode, slotDuration, consultantId]);

  useEffect(() => {
    if (!open || calendars.length === 0) return;
    const next = calendars.find((item) => item.id === calendarId) ?? calendars[0];
    if (!calendarId || !calendars.some((item) => item.id === calendarId)) {
      applyCalendar(next.id, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, calendars]);

  useEffect(() => {
    if (whenMode === "custom") {
      const parsed = parseStartHHmm(slot);
      if (!parsed) setSlot(nowHHmm());
      else if (parsed !== slot) setSlot(parsed);
      return;
    }
    if (slots.length === 0) {
      if (slot) setSlot("");
      return;
    }
    if (!slots.includes(slot)) setSlot(slots[0]);
  }, [slot, slots, whenMode]);

  const relatedOptions = useMemo(() => {
    const seed = relatedKind
      ? RELATED_RECORD_OPTIONS.filter((record) => record.kind === relatedKind)
      : RELATED_RECORD_OPTIONS;
    const live =
      relatedKind === "Contact"
        ? listAllContacts().map((contact) => ({
            kind: "Contact" as const,
            name: contact.name,
          }))
        : [];
    const seen = new Set<string>();
    const merged: { kind: RelatedEntityKind; name: string }[] = [];
    for (const item of [...live, ...seed]) {
      const key = item.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    if (
      relatedKind &&
      relatedName &&
      !seen.has(relatedName.trim().toLowerCase())
    ) {
      merged.unshift({
        kind: relatedKind as RelatedEntityKind,
        name: relatedName,
      });
    }
    return merged;
  }, [relatedKind, relatedName, recordTick]);

  if (!open) return null;

  const hostName =
    consultantId === "calendar-default"
      ? calendarDefaultHost(calendar)
      : consultantId;
  const consultant =
    calendlyHosts.find((host) => host.id === consultantId) ??
    calendlyHosts.find((host) => host.name === hostName) ??
    calendlyHosts.find((host) => host.name === calendar?.owner);
  const client = contacts.find((c) => c.id === clientId) ?? contacts[0];
  const guests = contacts.filter((c) => guestIds.includes(c.id));
  function applyCalendar(id: string, page?: BookingPage) {
    const next = page ?? calendars.find((item) => item.id === id);
    setCalendarId(id);
    if (!next) return;
    setTitle(next.title);
    if (next.description && showDescription) {
      setDescription(next.description);
    }
    setTimezone(calendarTimezoneOption(next.timezone));
    setConsultantId("calendar-default");
    setLocationMode("default");
    setMeetingLink(next.meetingViaDetail || next.videoLink || "");
    setCustomDuration(next.durationMinutes);
    const nextSlots = internalSlotsForDate(next, date);
    setSlot(
      nextSlots[0]
        ? formatSlotRange(nextSlots[0], next.durationMinutes)
        : "",
    );
  }

  async function handleSave() {
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
    if (!client) {
      setError("Choose a main applicant");
      return;
    }
    if (!date || !slot) {
      setError("Date & time is required");
      return;
    }
    if (!calendar) {
      setError("No Calendly event type available to book.");
      return;
    }
    const firstStart = new Date(`${date}T${slotStart(slot)}`);
    const minutes =
      whenMode === "custom"
        ? slotDuration
        : slotDurationMinutes(slot) || slotDuration;
    const starts =
      recurring && repeatRule.preset !== "none"
        ? listNextReminders(firstStart, repeatRule, 24)
        : [firstStart];
    if (starts.length === 0) {
      setError("No recurring times match this schedule");
      return;
    }
    const channel: AppointmentChannel =
      locationMode === "default"
        ? calendar?.meetingVia === "phone"
          ? "Phone Call"
          : calendar?.meetingVia === "in_person"
            ? "In Person"
            : "Video Call"
        : locationKind === "Phone"
          ? "Phone Call"
          : locationKind === "Full address"
            ? "In Person"
            : "Video Call";
    const meetingType: MeetingType =
      channel === "Phone Call"
        ? "Phone Call"
        : channel === "In Person"
          ? "In-person"
          : "Video Call";
    const location =
      locationMode === "default"
        ? calendar
          ? bookingLocationLabel(calendar)
          : "Calendar default"
        : locationKind === "Full address"
          ? address || "In person"
          : locationKind === "Phone"
            ? "Phone call"
            : locationKind;
    const repeatNote =
      recurring && repeatRule.preset !== "none"
        ? formatTaskRepeatSummary(repeatRule)
        : "";
    const note = [internalNote.trim(), repeatNote].filter(Boolean).join("\n");
    setSaving(true);
    setError("");
    try {
      const eventType = await resolveCalendlyEventType(calendar);
      if (eventType && isUuid(eventType.id) && client.email) {
        const booked = await createCalendlyBooking({
          idempotencyKey: newCalendlyIdempotencyKey(),
          eventTypeId: eventType.id,
          startTime: starts[0].toISOString(),
          name: client.name,
          email: client.email,
          timezone,
          ...calendlyCrmLinkFromRelated(relatedKind, relatedRecordId),
        });
        if (isUuid(booked.meetingId)) {
          await linkCalendlyMeetingCrm(
            booked.meetingId,
            calendlyCrmLinkFromRelated(relatedKind, relatedRecordId),
          ).catch(() => undefined);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Calendly booking failed.",
      );
    }
    try {
      for (const startDate of starts) {
        const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
        await createCrmMeeting({
          title: title.trim() || "Consultation",
          relatedTo:
            relatedKind && relatedName.trim()
              ? `${relatedKind}: ${relatedName.trim()}`
              : `Contact: ${client.name}`,
          relatedKind: relatedKind || "",
          relatedId: relatedRecordId || undefined,
          type: meetingType,
          startDateTime: formatMeetingDateTime(startDate),
          endDateTime: formatMeetingDateTime(endDate),
          status: "Scheduled",
          organizer: consultant?.name || hostName,
          location,
          meetingLink:
            locationMode === "default"
              ? calendar?.meetingViaDetail || calendar?.videoLink || undefined
              : locationKind === "Zoom" || locationKind === "Google Meet"
                ? meetingLink
                : undefined,
          agenda: description.trim() || undefined,
          notes: note || undefined,
          timezone,
        });
      }
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not create the CRM meeting.",
      );
      return;
    }
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-3 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="book-appointment-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3
            id="book-appointment-title"
            className="text-[16px] font-bold text-slate-900"
          >
            Book appointment
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

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 border-b border-slate-100 px-5 py-5 lg:border-r lg:border-b-0">
            <Field label="Calendar">
              <select
                value={calendarId}
                onChange={(e) => applyCalendar(e.target.value)}
                className={inputClass}
              >
                {calendars.length === 0 ? (
                  <option value="">No Calendly event types</option>
                ) : null}
                {calendars.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Appointment title" required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="FinConnex Financial Services | Free Finance Consultation"
                className={inputClass}
              />
            </Field>
            {showDescription ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    Description
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDescription(false);
                      setDescription("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                    aria-label="Remove description"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5A32A3]"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDescription(true);
                  if (!description && calendar?.description) {
                    setDescription(calendar.description);
                  }
                }}
                className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
              >
                Add description
              </button>
            )}
            <Field label="Team members">
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                className={inputClass}
              >
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Related Entity *">
                <select
                  className={inputClass}
                  value={relatedKind}
                  onChange={(e) => {
                    setRelatedKind(e.target.value as RelatedEntityKind | "");
                    setRelatedName("");
                  }}
                >
                  <option value="" disabled>
                    Select entity
                  </option>
                  {RELATED_ENTITY_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Related Record *">
                <RelatedRecordCombobox
                  value={relatedName}
                  onChange={setRelatedName}
                  onSelectOption={(option) =>
                    setRelatedRecordId(option?.id ?? "")
                  }
                  options={relatedOptions}
                  disabled={!relatedKind}
                  allowCustom={relatedKind === "Contact"}
                  createLabel={(name) => `Add contact “${name}”`}
                  onCreateOption={(name) => {
                    void createQuickContact(name).then((created) => {
                      setRelatedName(created.name);
                      setClientId(created.id);
                      setRecordTick((tick) => tick + 1);
                    });
                  }}
                />
              </Field>
            </div>

            <DateTimeSection
              timezone={timezone}
              onTimezoneChange={setTimezone}
              whenMode={whenMode}
              onWhenModeChange={setWhenMode}
              date={date}
              onDateChange={setDate}
              slot={slot}
              onSlotChange={setSlot}
              slots={slots.map((item) => ({ value: item, label: item }))}
              emptySlotLabel="No slots this day"
              durationMinutes={customDuration}
              onDurationMinutesChange={setCustomDuration}
              required
              duration={
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">
                    Duration
                  </label>
                  <div className="relative">
                    <select
                      value={String(customDuration)}
                      onChange={(e) => setCustomDuration(Number(e.target.value))}
                      className="h-10 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 pr-8 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              }
            />
            <div className="mt-3">
              <TaskRepeatBlock
                enabled={recurring}
                onEnabledChange={(on) => {
                  setRecurring(on);
                  if (!on) {
                    setRepeatRule({ ...defaultReminderRepeatRule });
                  }
                }}
                value={repeatRule}
                onChange={setRepeatRule}
                due={null}
                subtitle="Repeat this appointment on a schedule"
                fieldDescription="How often this appointment repeats at the selected time."
                allowAfterCompletion={false}
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Meeting location
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    checked={locationMode === "default"}
                    onChange={() => setLocationMode("default")}
                    className="mt-0.5 accent-[#5A32A3]"
                  />
                  <span>
                    Calendar default
                    <span className="block text-[11px] text-slate-400">
                      {calendar
                        ? bookingLocationLabel(calendar)
                        : "As configured in the calendar"}
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[13px] text-slate-700">
                  <input
                    type="radio"
                    checked={locationMode === "custom"}
                    onChange={() => setLocationMode("custom")}
                    className="mt-0.5 accent-[#5A32A3]"
                  />
                  Custom (Set specific to this appointment)
                </label>
              </div>
              {locationMode === "custom" ? (
                <div className="mt-3 space-y-2">
                  <select
                    value={locationKind}
                    onChange={(e) =>
                      setLocationKind(e.target.value as LocationKind)
                    }
                    className={inputClass}
                  >
                    {LOCATIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {locationKind === "Zoom" || locationKind === "Google Meet" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                      <Link2 className="h-4 w-4 text-slate-400" />
                      <input
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        className="h-10 flex-1 text-sm outline-none"
                      />
                    </div>
                  ) : null}
                  {locationKind === "Full address" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, suburb, state"
                        className="h-10 flex-1 text-sm outline-none"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                <Users className="h-4 w-4" />
                Attendees
                <span className="rounded-full bg-slate-100 px-1.5 text-[11px]">
                  {1 + guests.length}
                </span>
              </p>
            </div>

            {client ? (
              <AttendeeCard
                name={client.name}
                role="Main Applicant"
                slot={slot}
                dateLabel={prettyDate(date)}
                timezone={timezone}
                onRemove={undefined}
              />
            ) : null}
            <AttendeeCard
              name={hostName}
              role="Host"
              slot={slot}
              dateLabel={prettyDate(date)}
              timezone={timezone}
            />
            {guests.map((guest) => (
              <AttendeeCard
                key={guest.id}
                name={guest.name}
                role="Guest"
                slot={slot}
                dateLabel={prettyDate(date)}
                timezone={timezone}
                onRemove={() =>
                  setGuestIds((ids) => ids.filter((id) => id !== guest.id))
                }
              />
            ))}

            <Field label="Main applicant">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputClass}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            {addingGuest ? (
              <Field label="Add guest">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setGuestIds((ids) =>
                      ids.includes(e.target.value)
                        ? ids
                        : [...ids, e.target.value],
                    );
                    setAddingGuest(false);
                  }}
                  className={inputClass}
                >
                  <option value="">Select a guest</option>
                  {contacts
                    .filter((c) => c.id !== clientId && !guestIds.includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
            ) : (
              <button
                type="button"
                onClick={() => setAddingGuest(true)}
                className="inline-flex h-8 items-center gap-1 text-[12px] font-semibold text-[#5A32A3]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add guest
              </button>
            )}

            <div>
              <p className="mb-2 text-[12px] font-semibold text-slate-700">
                Internal notes
              </p>
              {showNote ? (
                <MentionNotesTextarea
                  value={internalNote}
                  onChange={setInternalNote}
                  rows={3}
                  placeholder="Internal notes… Type @ to mention someone."
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNote(true)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add internal note
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
            Status :
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as AppointmentStatus)
              }
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-800"
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="h-9 rounded-lg bg-[#5A32A3] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5A32A3]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function AttendeeCard({
  name,
  role,
  slot,
  dateLabel,
  timezone,
  onRemove,
}: {
  name: string;
  role: MeetingAttendeeRole;
  slot: string;
  dateLabel: string;
  timezone: string;
  onRemove?: () => void;
}) {
  const zone = timezone.includes("Sydney")
    ? "Australia/Sydney"
    : timezone.split(" ").slice(-1)[0];
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3ECFB] text-[10px] font-bold text-[#5A32A3]">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {name}
            </p>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                ROLE_STYLE[role],
              )}
            >
              {role}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {dateLabel}, {slot}
          </p>
          <p className="text-[11px] text-slate-400">
            Contact&apos;s local time ({zone})
          </p>
        </div>
        <div className="flex gap-1 text-slate-400">
          <Info className="h-3.5 w-3.5" />
          <ExternalLink className="h-3.5 w-3.5" />
          {onRemove ? (
            <button type="button" onClick={onRemove} aria-label="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
