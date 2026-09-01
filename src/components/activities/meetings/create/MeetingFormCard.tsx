"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Link2, MapPin, LocateFixed } from "lucide-react";
import type { MeetingType } from "@/lib/meetings/types";
import { DateTimeSection } from "@/components/booking/DateTimeSection";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { TaskRepeatBlock } from "@/components/activities/tasks/ReminderSettingsCard";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { formatSlotRange } from "@/lib/booking/types";
import { liveRelatedRecords } from "@/lib/activities/related-records";
import {
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { createQuickContact } from "@/lib/contacts/store";
import {
  availableCustomLocationKinds,
  isOnlineLocationKind,
  type MeetingLocationKind,
} from "@/lib/booking/meeting-platforms";
import { SearchablePersonSelect } from "@/components/shared/SearchablePersonSelect";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { cn } from "@/lib/utils";

export type { MeetingLocationKind };
export type MeetingLocationMode = "default" | "custom";

const FALLBACK_DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90 min"];

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none";

interface MeetingFormCardProps {
  calendars: { id: string; title: string }[];
  calendarId: string;
  onCalendarChange: (id: string) => void;
  teamMembers: string[];
  timeSlots: string[];
  defaultLocationLabel?: string;
  title: string;
  onTitleChange: (val: string) => void;
  teamMember: string;
  onTeamMemberChange: (val: string) => void;
  date: string;
  onDateChange: (val: string) => void;
  time: string;
  onTimeChange: (val: string) => void;
  duration: string;
  onDurationChange: (val: string) => void;
  whenMode?: "default" | "custom";
  onWhenModeChange?: (mode: "default" | "custom") => void;
  meetingType: MeetingType;
  onMeetingTypeChange: (type: MeetingType) => void;
  meetingLink: string;
  onMeetingLinkChange: (val: string) => void;
  locationMode: MeetingLocationMode;
  onLocationModeChange: (mode: MeetingLocationMode) => void;
  locationKind: MeetingLocationKind;
  onLocationKindChange: (kind: MeetingLocationKind) => void;
  locationDetail: string;
  onLocationDetailChange: (val: string) => void;
  agenda: string;
  onAgendaChange: (val: string) => void;
  timezone?: string;
  onTimezoneChange?: (val: string) => void;
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (kind: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (name: string) => void;
  recurring?: boolean;
  onRecurringChange?: (on: boolean) => void;
  repeatRule?: ReminderRepeatRule;
  onRepeatRuleChange?: (rule: ReminderRepeatRule) => void;
  compact?: boolean;
  hideRelated?: boolean;
  hideAgenda?: boolean;
  titleError?: string;
  dateTimeError?: string;
}

export function MeetingRelatedFields({
  relatedKind,
  onRelatedKindChange,
  relatedName,
  onRelatedNameChange,
}: {
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (kind: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (name: string) => void;
}) {
  const [recordTick, setRecordTick] = useState(0);
  const relatedOptions = useMemo(
    () =>
      liveRelatedRecords(
        relatedKind,
        relatedKind && relatedName
          ? { kind: relatedKind, name: relatedName }
          : undefined,
      ),
    [relatedKind, relatedName, recordTick],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className={cn(labelClass, "mb-1.5 block")}>
          Related Entity <span className="text-red-500">*</span>
        </label>
        <select
          className={selectClass}
          value={relatedKind}
          onChange={(e) => {
            onRelatedKindChange(e.target.value as RelatedEntityKind | "");
            onRelatedNameChange("");
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
      </div>
      <div>
        <label className={cn(labelClass, "mb-1.5 block")}>
          Related Record <span className="text-red-500">*</span>
        </label>
        <RelatedRecordCombobox
          value={relatedName}
          onChange={onRelatedNameChange}
          options={relatedOptions}
          disabled={!relatedKind}
          allowCustom={relatedKind === "Contact"}
          createLabel={(name) => `Add contact “${name}”`}
          onCreateOption={(name) => {
            const created = createQuickContact(name);
            onRelatedNameChange(created.name);
            setRecordTick((tick) => tick + 1);
          }}
        />
      </div>
    </div>
  );
}

export const MeetingFormCard: React.FC<MeetingFormCardProps> = ({
  calendars,
  calendarId,
  onCalendarChange,
  teamMembers,
  timeSlots,
  defaultLocationLabel,
  title,
  onTitleChange,
  teamMember,
  onTeamMemberChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  whenMode = "default",
  onWhenModeChange,
  onMeetingTypeChange,
  meetingLink,
  onMeetingLinkChange,
  locationMode,
  onLocationModeChange,
  locationKind,
  onLocationKindChange,
  locationDetail,
  onLocationDetailChange,
  agenda,
  onAgendaChange,
  timezone,
  onTimezoneChange,
  relatedKind,
  onRelatedKindChange,
  relatedName,
  onRelatedNameChange,
  recurring = false,
  onRecurringChange,
  repeatRule = defaultReminderRepeatRule,
  onRepeatRuleChange,
  compact = false,
  hideRelated = false,
  hideAgenda = false,
  titleError,
  dateTimeError,
}) => {
  const locationKinds = useMemo(() => availableCustomLocationKinds(), []);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!locationKinds.includes(locationKind)) {
      applyLocationKind(locationKinds[0] ?? "Custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKind, locationKinds]);

  function applyLocationKind(kind: MeetingLocationKind) {
    onLocationKindChange(kind);
    if (kind === "Office address" || kind === "Custom") {
      onMeetingTypeChange("In-person");
    } else {
      onMeetingTypeChange("Video Call");
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          if (!response.ok) throw new Error("lookup failed");
          const data = (await response.json()) as { display_name?: string };
          onLocationDetailChange(
            data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
        } catch {
          onLocationDetailChange(
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setGeoError("Could not read your location. Allow access and try again.");
      },
    );
  }

  const showLink =
    locationMode === "custom" && isOnlineLocationKind(locationKind);

  return (
    <div
      className={cn(
        compact ? "space-y-5" : "space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm",
      )}
    >
      <div>
        <label className={labelClass}>Calendar</label>
        <select
          value={calendarId}
          onChange={(e) => onCalendarChange(e.target.value)}
          className={selectClass}
        >
          {calendars.length === 0 ? (
            <option value="">No active consultations</option>
          ) : (
            calendars.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Appointment title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Q3 Strategy Review with Acme Corp"
          aria-required
          aria-invalid={Boolean(titleError) || undefined}
          className={cn(inputClass, titleError && "border-rose-400 focus:border-rose-500 focus:ring-rose-200")}
        />
        {titleError ? (
          <p className="mt-1.5 text-[12px] font-medium text-rose-500">{titleError}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass}>Team members</label>
        <SearchablePersonSelect
          value={teamMember}
          onChange={onTeamMemberChange}
          options={["Calendar Default", ...teamMembers]}
          placeholder="Search team member…"
        />
      </div>

      {hideRelated ? null : (
        <MeetingRelatedFields
          relatedKind={relatedKind}
          onRelatedKindChange={onRelatedKindChange}
          relatedName={relatedName}
          onRelatedNameChange={onRelatedNameChange}
        />
      )}

      <DateTimeSection
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        whenMode={whenMode}
        onWhenModeChange={onWhenModeChange}
        date={date}
        onDateChange={onDateChange}
        slot={time}
        onSlotChange={onTimeChange}
        slots={timeSlots.map((slot) => ({
          value: slot,
          label: formatSlotRange(slot, Number.parseInt(duration, 10) || 30),
        }))}
        fieldsLayout={compact ? "stacked" : "row"}
        durationMinutes={Number.parseInt(duration, 10) || 30}
        onDurationMinutesChange={(minutes) =>
          onDurationChange(`${minutes} min`)
        }
        required
        error={dateTimeError}
        duration={
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Duration
            </label>
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => onDurationChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 pr-8 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {FALLBACK_DURATIONS.includes(duration) ? null : (
                  <option value={duration}>{duration}</option>
                )}
                {FALLBACK_DURATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        }
      />

      {onRecurringChange && onRepeatRuleChange ? (
        <TaskRepeatBlock
          enabled={recurring}
          onEnabledChange={(on) => {
            onRecurringChange(on);
            if (!on) onRepeatRuleChange({ ...defaultReminderRepeatRule });
          }}
          value={repeatRule}
          onChange={onRepeatRuleChange}
          due={null}
          label="Recurring meeting"
          subtitle="Repeat this meeting on a schedule"
          fieldDescription="How often this meeting repeats at the selected time."
          allowAfterCompletion={false}
          compact
        />
      ) : null}

      <div className="space-y-4">
        <label className={labelClass}>Location</label>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="radio"
              checked={locationMode === "default"}
              onChange={() => onLocationModeChange("default")}
              className="mt-0.5 h-4 w-4 accent-[#5A32A3]"
            />
            <span>
              Calendar default
              <span className="block text-[11px] text-gray-500">
                {defaultLocationLabel || "As configured in the calendar"}
              </span>
            </span>
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                checked={locationMode === "custom"}
                onChange={() => onLocationModeChange("custom")}
                className="mt-0.5 h-4 w-4 accent-[#5A32A3]"
              />
              <span>
                Custom
                <span className="block text-[11px] text-gray-500">
                  Set specific to this appointment
                </span>
              </span>
            </label>
            {locationMode === "custom" ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={
                      locationKinds.includes(locationKind)
                        ? locationKind
                        : (locationKinds[0] ?? "Office address")
                    }
                    onChange={(e) =>
                      applyLocationKind(e.target.value as MeetingLocationKind)
                    }
                    className={selectClass + " pr-8"}
                  >
                    {locationKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {showLink ? (
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={meetingLink}
                      onChange={(e) => onMeetingLinkChange(e.target.value)}
                      placeholder={
                        locationKind === "Zoom"
                          ? "https://zoom.us/j/..."
                          : locationKind === "Microsoft Teams"
                            ? "https://teams.microsoft.com/..."
                            : "https://meet.google.com/..."
                      }
                      className={inputClass + " pl-9 font-mono text-xs text-violet-700"}
                    />
                  </div>
                ) : null}
                {locationKind === "Office address" ? (
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={locationDetail}
                      onChange={(e) => onLocationDetailChange(e.target.value)}
                      placeholder="Office street, suburb, state"
                      className={inputClass + " pl-9"}
                    />
                  </div>
                ) : null}
                {locationKind === "Custom" ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={locationDetail}
                        onChange={(e) => onLocationDetailChange(e.target.value)}
                        placeholder="Search or enter an address"
                        className={inputClass + " pl-9"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800 disabled:opacity-60"
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      {locating ? "Finding location…" : "Use current location"}
                    </button>
                    {geoError ? (
                      <p className="text-[11px] font-medium text-rose-500">
                        {geoError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hideAgenda ? null : (
        <div>
          <label className={labelClass}>Internal note</label>
          <div className="mt-1.5">
            <MentionNotesTextarea
              rows={4}
              value={agenda}
              onChange={onAgendaChange}
              placeholder="Internal notes… Type @ to mention someone."
              className={
                compact
                  ? "min-h-[88px] w-full resize-y rounded-lg bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  : "min-h-[110px] w-full resize-y rounded-lg bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
