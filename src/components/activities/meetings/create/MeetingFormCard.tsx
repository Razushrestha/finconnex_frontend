"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { ChevronDown, Link2, MapPin } from "lucide-react";
import { UseCurrentLocationButton } from "@/components/shared/UseCurrentLocationButton";
import type { MeetingType } from "@/lib/meetings/types";
import { DateTimeSection } from "@/components/booking/DateTimeSection";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { ContactNameCombobox } from "@/components/shared/ContactNameCombobox";
import { TaskRepeatBlock } from "@/components/activities/tasks/ReminderSettingsCard";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { formatSlotRange } from "@/lib/booking/types";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import {
  TASK_RELATED_ENTITY_KINDS,
  liveRelatedRecords,
  rankRelatedRecordsByContact,
} from "@/lib/activities/related-records";
import { type RelatedEntityKind } from "@/lib/activities/shared";
import {
  availableCustomLocationKinds,
  isOnlineLocationKind,
  savedOfficeAddress,
  type MeetingLocationKind,
} from "@/lib/booking/meeting-platforms";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import {
  MeetingGuestPicker,
  type MeetingGuest,
} from "@/components/activities/meetings/create/MeetingGuestPicker";
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
  contactName?: string;
  onContactNameChange?: (name: string) => void;
  contactError?: string;
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (kind: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (name: string) => void;
  onRelatedIdChange?: (id: string) => void;
  recurring?: boolean;
  onRecurringChange?: (on: boolean) => void;
  repeatRule?: ReminderRepeatRule;
  onRepeatRuleChange?: (rule: ReminderRepeatRule) => void;
  compact?: boolean;
  guests?: MeetingGuest[];
  onGuestsChange?: (next: MeetingGuest[]) => void;
  hideRelated?: boolean;
  hideAgenda?: boolean;
  titleError?: string;
  dateTimeError?: string;
}

export function MeetingRelatedFields({
  contactName = "",
  onContactNameChange,
  relatedKind,
  onRelatedKindChange,
  relatedName,
  onRelatedNameChange,
  onRelatedIdChange,
  contactError,
}: {
  contactName?: string;
  onContactNameChange?: (name: string) => void;
  relatedKind: RelatedEntityKind | "";
  onRelatedKindChange: (kind: RelatedEntityKind | "") => void;
  relatedName: string;
  onRelatedNameChange: (name: string) => void;
  onRelatedIdChange?: (id: string) => void;
  contactError?: string;
}) {
  const [addingContact, setAddingContact] = useState(false);
  const [addContactQuery, setAddContactQuery] = useState("");
  const [contactTick, setContactTick] = useState(0);
  const extra =
    relatedKind && relatedName
      ? { kind: relatedKind, name: relatedName }
      : undefined;
  const { options: relatedRemote, loading } = useCrmRelatedRecords(
    relatedKind,
    extra,
  );
  const contactOptions = useMemo(
    () => liveRelatedRecords("Contact"),
    [contactTick],
  );
  const relatedOptions = useMemo(
    () => rankRelatedRecordsByContact(relatedRemote, contactName),
    [relatedRemote, contactName],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className={cn(labelClass, "mb-1.5 block")}>
          Contact Name <span className="text-red-500">*</span>
        </label>
        <ContactNameCombobox
          value={contactName}
          onChange={(name) => onContactNameChange?.(name)}
          placeholder="Add contact"
          addLabel="Add contact"
          error={Boolean(contactError)}
        />
        {contactError ? (
          <p className="mt-1.5 text-[12px] font-medium text-rose-500">
            {contactError}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={cn(labelClass, "mb-1.5 block")}>
            Related Entity
          </label>
          <select
            className={selectClass}
            value={relatedKind}
            onChange={(e) => {
              onRelatedKindChange(e.target.value as RelatedEntityKind | "");
              onRelatedNameChange("");
              onRelatedIdChange?.("");
            }}
          >
            <option value="">None</option>
            {TASK_RELATED_ENTITY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={cn(labelClass, "mb-1.5 block")}>
            Related Record
          </label>
          <RelatedRecordCombobox
            value={relatedName}
            onChange={onRelatedNameChange}
            onSelectOption={(option) => onRelatedIdChange?.(option?.id ?? "")}
            options={relatedOptions}
            disabled={!relatedKind}
            placeholder={
              loading
                ? "Loading CRM records…"
                : relatedKind
                  ? `Search ${relatedKind.toLowerCase()}…`
                  : "Select related entity first"
            }
          />
        </div>
      </div>
    </div>
  );
}

export const MeetingFormCard: FC<MeetingFormCardProps> = ({
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
  contactName,
  onContactNameChange,
  contactError,
  relatedKind,
  onRelatedKindChange,
  relatedName,
  onRelatedNameChange,
  onRelatedIdChange,
  recurring = false,
  onRecurringChange,
  repeatRule = defaultReminderRepeatRule,
  onRepeatRuleChange,
  guests,
  onGuestsChange,
  compact = false,
  hideRelated = false,
  hideAgenda = false,
  titleError,
  dateTimeError,
}) => {
  const locationKinds = useMemo(() => availableCustomLocationKinds(), []);
  const crmSettings = useCrmSettings();
  const officeAddress = savedOfficeAddress(crmSettings.settings?.catalog);

  // Office address starts as the one in Settings → Company Profile — also when
  // that arrives after the form opened (CRM settings load asynchronously).
  // Anything already typed is left alone.
  useEffect(() => {
    if (
      locationKind === "Office address" &&
      officeAddress &&
      !locationDetail.trim()
    ) {
      onLocationDetailChange(officeAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKind, officeAddress]);

  useEffect(() => {
    if (!locationKinds.includes(locationKind)) {
      applyLocationKind(locationKinds[0] ?? "Custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKind, locationKinds]);

  function applyLocationKind(kind: MeetingLocationKind) {
    onLocationKindChange(kind);
    if (kind === "Office address" && officeAddress) {
      onLocationDetailChange(officeAddress);
    }
    if (kind === "Office address" || kind === "Custom") {
      onMeetingTypeChange("In-person");
    } else {
      onMeetingTypeChange("Video Call");
    }
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
          contactName={contactName}
          onContactNameChange={onContactNameChange}
          contactError={contactError}
          relatedKind={relatedKind}
          onRelatedKindChange={onRelatedKindChange}
          relatedName={relatedName}
          onRelatedNameChange={onRelatedNameChange}
          onRelatedIdChange={onRelatedIdChange}
        />
      )}

      {onGuestsChange ? (
        <MeetingGuestPicker guests={guests ?? []} onChange={onGuestsChange} />
      ) : null}

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
                      placeholder={
                        officeAddress
                          ? "Office street, suburb, state"
                          : "Office street, suburb, state (set a default in Settings → Company Profile)"
                      }
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
                    <UseCurrentLocationButton onAddress={onLocationDetailChange} />
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
