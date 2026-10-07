"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadConsultationAvailability,
  syncConsultationAvailability,
} from "@/lib/booking/availability-sync";
import { Copy, Info, Pencil, Plus } from "lucide-react";
import {
  DateRangeField,
  ListboxSelect,
  MAX_RANGE_DAYS,
  SlotLimitField,
  describeSlotLimit,
  formatLimitRange,
  normalizeSlotLimit,
  rangeDayCount,
  slotLimitNeedsNumber,
} from "@/components/booking/LimitsControls";
import type { AvailabilityPanelId } from "@/components/booking/ConsultationWizardLayout";
import {
  WEEKDAYS,
  type AvailabilityRule,
  type Weekday,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils";
import { TimeZonePicker } from "@/components/booking/TimeZonePicker";

const BRAND = "#5A32A3";

export type CustomDateLimit = {
  id: string;
  start: string;
  end: string;
  slotsPerEvent: string;
  slotsPerCustomer: string;
};

export type AvailabilityLimitsValues = {
  defaultHours: boolean;
  overrideUserHours: boolean;
  userSpecificHours: boolean;
  weekly: AvailabilityRule[];
  userHours: Record<string, AvailabilityRule[]>;
  slotsPerEvent: string;
  slotsPerCustomer: string;
  customLimits: CustomDateLimit[];
};

function defaultWeek(): AvailabilityRule[] {
  return WEEKDAYS.map((day) => ({
    day,
    enabled: day !== "Saturday" && day !== "Sunday",
    start: "09:00",
    end: "17:00",
  }));
}

export function defaultAvailabilityLimits(): AvailabilityLimitsValues {
  return {
    defaultHours: true,
    overrideUserHours: false,
    userSpecificHours: true,
    weekly: defaultWeek(),
    userHours: {},
    slotsPerEvent: "No limit",
    slotsPerCustomer: "No limit",
    customLimits: [],
  };
}

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-400">
        <Info className="h-2.5 w-2.5" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 group-hover:block">
        <span className="block rounded-md bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg">
          {text}
        </span>
      </span>
    </span>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
      style={{
        borderColor: checked ? BRAND : "#CBD5E1",
        backgroundColor: checked ? BRAND : "white",
      }}
      aria-label={label}
      aria-pressed={checked}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" aria-hidden>
          <path
            d="M2 6.2 4.6 8.8 10 3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

function OutlineButton({
  children,
  onClick,
  icon = "pencil",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: "pencil" | "plus";
}) {
  const Icon = icon === "plus" ? Plus : Pencil;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold hover:bg-[#F3ECFB]"
      style={{ borderColor: BRAND, color: BRAND }}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function HoursEditor({
  rules,
  onChange,
}: {
  rules: AvailabilityRule[];
  onChange: (next: AvailabilityRule[]) => void;
}) {
  const monday = rules.find((rule) => rule.day === "Monday");
  const mondayFilled = Boolean(monday?.enabled && monday.start && monday.end);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDays, setCopyDays] = useState<Weekday[]>(() =>
    WEEKDAYS.filter((day) => day !== "Monday" && day !== "Saturday" && day !== "Sunday"),
  );

  function patch(day: Weekday, partial: Partial<AvailabilityRule>) {
    onChange(rules.map((rule) => (rule.day === day ? { ...rule, ...partial } : rule)));
  }

  function toggleCopyDay(day: Weekday) {
    setCopyDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  }

  function copyMondayHours() {
    if (!monday || copyDays.length === 0) return;
    const targets = new Set(copyDays);
    onChange(
      rules.map((rule) =>
        targets.has(rule.day)
          ? { ...rule, enabled: true, start: monday.start, end: monday.end }
          : rule,
      ),
    );
    setCopyOpen(false);
  }

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-[#E5E7EB] bg-[#FAF8FD] p-3">
      {rules.map((rule) => (
        <div
          key={rule.day}
          className={cn(
            "flex flex-wrap items-center gap-2",
            rule.day === "Monday" && copyOpen && "relative z-20",
          )}
        >
          <label className="flex w-28 items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => patch(rule.day, { enabled: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#5A32A3]"
            />
            {rule.day.slice(0, 3)}
          </label>
          <input
            type="time"
            value={rule.start}
            disabled={!rule.enabled}
            onChange={(e) => patch(rule.day, { start: e.target.value })}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-2 text-[13px] disabled:text-slate-300"
          />
          <span className="text-[12px] text-slate-400">to</span>
          <input
            type="time"
            value={rule.end}
            disabled={!rule.enabled}
            onChange={(e) => patch(rule.day, { end: e.target.value })}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-2 text-[13px] disabled:text-slate-300"
          />
          {rule.day === "Monday" && mondayFilled ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Copy Monday's hours"
                title="Copy Monday's hours"
                onClick={() => setCopyOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#5A32A3] hover:bg-[#F3ECFB]"
              >
                <Copy className="h-4 w-4" />
              </button>
              {copyOpen ? (
                <div className="absolute left-0 top-11 z-20 w-52 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
                  <p className="text-[12px] font-semibold text-slate-700">Copy Monday&apos;s hours to</p>
                  <div className="mt-2 space-y-1.5">
                    {WEEKDAYS.filter((day) => day !== "Monday").map((day) => (
                      <label key={day} className="flex items-center gap-2 text-[13px] text-slate-700">
                        <input
                          type="checkbox"
                          checked={copyDays.includes(day)}
                          onChange={() => toggleCopyDay(day)}
                          className="h-3.5 w-3.5 accent-[#5A32A3]"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={copyDays.length === 0}
                    onClick={copyMondayHours}
                    className="mt-3 h-8 w-full rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
                    style={{ backgroundColor: BRAND }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AvailabilityLimitsStep({
  panel,
  consultants,
  consultantUserIds,
  initial,
  timezone,
  onTimezoneChange,
  onBack,
  onNext,
  onChange,
  embedded = false,
}: {
  panel: AvailabilityPanelId;
  consultants: string[];
  consultantUserIds?: Record<string, string>;
  initial?: AvailabilityLimitsValues | null;
  timezone?: string;
  /** Set when the hours' time zone can be chosen here. */
  onTimezoneChange?: (zone: string) => void;
  onBack: () => void;
  onNext: (values: AvailabilityLimitsValues, hostIds: string[]) => void;
  onChange?: (values: AvailabilityLimitsValues) => void;
  embedded?: boolean;
}) {
  const [values, setValues] = useState<AvailabilityLimitsValues>(
    initial ?? defaultAvailabilityLimits(),
  );
  const [editingDefault, setEditingDefault] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftEvent, setDraftEvent] = useState("No limit");
  const [draftCustomer, setDraftCustomer] = useState("No limit");
  const [draftError, setDraftError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const hydrated = useRef(false);
  // Once the user edits a limit, a late server load must not overwrite it.
  const limitsEdited = useRef(false);
  // In a consultation's settings (embedded) there is no Next to save with, so
  // the hours and zone are sent to the CRM shortly after each change; without
  // this the host's schedule kept its old zone and hours.
  const userEdited = useRef(false);
  const initialTimezone = useRef(timezone);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    onChange?.(values);
  }, [values, onChange]);

  useEffect(() => {
    if (!embedded || !consultants.length) return;
    if (timezone !== initialTimezone.current) userEdited.current = true;
    if (!userEdited.current) return;
    if (slotLimitNeedsNumber(values.slotsPerEvent) || slotLimitNeedsNumber(values.slotsPerCustomer)) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSyncState("saving");
      setSyncError("");
      syncConsultationAvailability({
        names: consultants,
        userIds: consultantUserIds,
        timezone,
        values: {
          ...values,
          slotsPerEvent: normalizeSlotLimit(values.slotsPerEvent),
          slotsPerCustomer: normalizeSlotLimit(values.slotsPerCustomer),
        },
      })
        .then(() => setSyncState("saved"))
        .catch((err: unknown) => {
          setSyncState("error");
          setSyncError(err instanceof Error ? err.message : "Could not save availability");
        });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [embedded, values, timezone, consultants, consultantUserIds]);

  useEffect(() => {
    if (hydrated.current || !consultants.length) return;
    let alive = true;
    void loadConsultationAvailability({
      names: consultants,
      userIds: consultantUserIds,
    })
      .then((loaded) => {
        if (!alive || !loaded || hydrated.current) return;
        hydrated.current = true;
        setValues((prev) => ({
          ...prev,
          ...loaded,
          weekly: loaded.weekly?.length ? loaded.weekly : prev.weekly,
          userHours: { ...prev.userHours, ...loaded.userHours },
          slotsPerEvent: limitsEdited.current
            ? prev.slotsPerEvent
            : (loaded.slotsPerEvent ?? prev.slotsPerEvent),
          slotsPerCustomer: prev.slotsPerCustomer,
          customLimits:
            limitsEdited.current || !loaded.customLimits?.length
              ? prev.customLimits
              : loaded.customLimits,
        }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [consultants, consultantUserIds]);

  async function handleNext() {
    setSaveError("");
    if (
      slotLimitNeedsNumber(values.slotsPerEvent) ||
      slotLimitNeedsNumber(values.slotsPerCustomer)
    ) {
      setSaveError(
        "Enter a number for the Per day limit in Appointment Limits, or switch it to No limit.",
      );
      return;
    }
    setSaving(true);
    try {
      const hostIds = await syncConsultationAvailability({
        names: consultants,
        userIds: consultantUserIds,
        timezone,
        values: {
          ...values,
          slotsPerEvent: normalizeSlotLimit(values.slotsPerEvent),
          slotsPerCustomer: normalizeSlotLimit(values.slotsPerCustomer),
        },
      });
      onNext(values, hostIds);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save availability",
      );
    } finally {
      setSaving(false);
    }
  }

  function patch(partial: Partial<AvailabilityLimitsValues>) {
    userEdited.current = true;
    if (
      "slotsPerEvent" in partial ||
      "slotsPerCustomer" in partial ||
      "customLimits" in partial
    ) {
      limitsEdited.current = true;
    }
    setValues((prev) => ({ ...prev, ...partial }));
  }

  function saveLimit() {
    if (!draftStart || !draftEnd) {
      setDraftError("Select a start and end date");
      return;
    }
    if (draftEnd < draftStart) {
      setDraftError("End date must be on or after the start date");
      return;
    }
    if (rangeDayCount(draftStart, draftEnd) > MAX_RANGE_DAYS) {
      setDraftError(`A custom date limit can cover at most ${MAX_RANGE_DAYS} days`);
      return;
    }
    if (slotLimitNeedsNumber(draftEvent) || slotLimitNeedsNumber(draftCustomer)) {
      setDraftError("Enter a number for the Per day limit");
      return;
    }
    setDraftError("");
    patch({
      customLimits: [
        ...values.customLimits,
        {
          id: `limit-${Date.now()}`,
          start: draftStart,
          end: draftEnd,
          slotsPerEvent: draftEvent,
          slotsPerCustomer: draftCustomer,
        },
      ],
    });
    setDraftStart("");
    setDraftEnd("");
    setDraftEvent("No limit");
    setDraftCustomer("No limit");
  }

  const activeUser = editingUser && consultants.includes(editingUser)
    ? editingUser
    : consultants[0] ?? null;
  const userRules =
    (activeUser && values.userHours[activeUser]) || defaultWeek();

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        embedded ? "pb-2" : "mx-auto max-w-[920px] pb-8",
      )}
    >
      <div
        className={cn(
          embedded
            ? ""
            : "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        )}
      >
        {panel === "dates" ? (
          <div className="px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-[16px] font-semibold text-slate-900">
                Event Type Availability
              </h1>
              <div className="flex items-center gap-2">
                {embedded && syncState !== "idle" ? (
                  <span
                    role={syncState === "error" ? "alert" : "status"}
                    className={cn(
                      "text-[12px] font-medium",
                      syncState === "error" ? "text-rose-600" : "text-slate-500",
                    )}
                  >
                    {syncState === "saving"
                      ? "Saving…"
                      : syncState === "saved"
                        ? "Saved"
                        : syncError || "Not saved"}
                  </span>
                ) : null}
                <Tip text="Hours guests can book this consultation." />
              </div>
            </div>

            {onTimezoneChange ? (
              <section className="mb-4 rounded-xl border border-[#E5E7EB] px-4 py-4">
                <p className="text-[14px] font-semibold text-slate-900">Time zone</p>
                <p className="mt-0.5 mb-3 text-[12px] text-slate-500">
                  Set this first: the hours below are read in this time zone, and it is the
                  booking page&apos;s default. Guests can switch to their own.
                </p>
                <TimeZonePicker
                  value={timezone || "UTC"}
                  onChange={onTimezoneChange}
                  ariaLabel="Consultation time zone"
                  className="h-10 border-[#E5E7EB] text-[13px]"
                />
              </section>
            ) : null}

            <section className="rounded-xl border border-[#E5E7EB] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2.5">
                  <Check
                    checked={values.defaultHours}
                    onChange={(defaultHours) => patch({ defaultHours })}
                    label="Default Hours"
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">
                      Default Hours
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Set availability specific to this event type.
                    </p>
                  </div>
                </div>
                <OutlineButton onClick={() => setEditingDefault((open) => !open)}>
                  Customize
                </OutlineButton>
              </div>

              {values.defaultHours ? (
                <div className="mt-4 space-y-3 pl-6">
                  <div>
                    <p className="text-[13px] text-slate-700">Schedule Based On</p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-900">
                      User Working Hours
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Available dates
                    </p>
                    <p className="mt-1 text-[14px] text-slate-800">Forever</p>
                  </div>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={values.overrideUserHours}
                      onChange={(e) =>
                        patch({ overrideUserHours: e.target.checked })
                      }
                      className="h-3.5 w-3.5 accent-[#5A32A3]"
                    />
                    Override User specific Hours
                  </label>
                  {editingDefault ? (
                    <HoursEditor
                      rules={values.weekly}
                      onChange={(weekly) => patch({ weekly })}
                    />
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="mt-4 rounded-xl border border-[#E5E7EB] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2.5">
                  <Check
                    checked={values.userSpecificHours}
                    onChange={(userSpecificHours) => patch({ userSpecificHours })}
                    label="User-specific Hours"
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">
                      User-specific Hours
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Set different availability for specific Users.
                    </p>
                  </div>
                </div>
                <OutlineButton
                  icon="plus"
                  onClick={() =>
                    setEditingUser((current) =>
                      current ? null : consultants[0] ?? "",
                    )
                  }
                >
                  Add Working Hours
                </OutlineButton>
              </div>
              {values.userSpecificHours && editingUser !== null ? (
                <div className="mt-4 pl-6">
                  {consultants.length === 0 ? (
                    <p className="text-[13px] text-slate-500">
                      Assign a consultant first to set their hours.
                    </p>
                  ) : (
                    <>
                      <ListboxSelect
                        label="User"
                        value={activeUser ?? ""}
                        options={consultants.map((name) => ({
                          value: name,
                          label: name,
                        }))}
                        onChange={setEditingUser}
                        className="max-w-xs"
                      />
                      {activeUser ? (
                        <HoursEditor
                          rules={userRules}
                          onChange={(weekly) =>
                            patch({
                              userHours: {
                                ...values.userHours,
                                [activeUser]: weekly,
                              },
                            })
                          }
                        />
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        ) : (
          <div className="px-5 py-5 sm:px-6">
            <div className="-mx-5 mb-6 flex items-center gap-2.5 border-b border-[#E5E7EB] px-5 pb-4 sm:-mx-6 sm:px-6">
              <span
                className="h-5 w-[3px] rounded-full"
                style={{ backgroundColor: BRAND }}
              />
              <h1 className="text-[16px] font-bold text-slate-900">
                Appointment Limits
              </h1>
              <Tip text="Cap how often this event type can be booked." />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-slate-900">
                  Slots per Event Type
                </p>
                <Tip text="How many times this consultation can be booked in a day." />
              </div>
              <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500">
                Set the number of times this event type can be booked per day
              </p>
              <div className="mt-3">
                <SlotLimitField
                  kind="event"
                  label="Slots per Event Type"
                  value={values.slotsPerEvent}
                  onChange={(slotsPerEvent) => patch({ slotsPerEvent })}
                />
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-slate-900">
                  Slots per Customer
                </p>
                <Tip text="How often the same customer can book before the previous appointment is finished." />
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500">
                Set how often a Customer can book this event type or prevent the
                customer from rebooking until the previous appointment is
                completed, cancelled, or marked as a no-show.
              </p>
              <div className="mt-3">
                <SlotLimitField
                  kind="customer"
                  label="Slots per Customer"
                  value={values.slotsPerCustomer}
                  onChange={(slotsPerCustomer) => patch({ slotsPerCustomer })}
                />
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-slate-900">
                  Custom Date Limits
                </p>
                <Tip text="These limits replace the default for the dates you pick." />
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500">
                Set booking limits for a specific date or date range. Custom date
                limits will override the default limit for the selected period.
              </p>

              {values.customLimits.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {values.customLimits.map((limit) => (
                    <li
                      key={limit.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-slate-700"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-900">
                          {formatLimitRange(limit.start, limit.end)}
                        </span>
                        <span className="ml-2 text-slate-500">
                          Event type: {describeSlotLimit(limit.slotsPerEvent)}
                          {" · "}
                          Customer: {describeSlotLimit(limit.slotsPerCustomer)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            customLimits: values.customLimits.filter(
                              (row) => row.id !== limit.id,
                            ),
                          })
                        }
                        className="text-[12px] font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="mb-1.5 text-[12px] font-medium text-slate-600">
                  Select Date Range
                </p>
                <DateRangeField
                  start={draftStart}
                  end={draftEnd}
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  onChange={(start, end) => {
                    setDraftStart(start);
                    setDraftEnd(end);
                    setDraftError("");
                  }}
                />

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-slate-600">
                      Slots per Event Type
                    </p>
                    <SlotLimitField
                      kind="event"
                      label="Custom slots per event type"
                      value={draftEvent}
                      onChange={setDraftEvent}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-slate-600">
                      Slots per Customer
                    </p>
                    <SlotLimitField
                      kind="customer"
                      label="Custom slots per customer"
                      value={draftCustomer}
                      onChange={setDraftCustomer}
                    />
                  </div>
                </div>

                {draftError ? (
                  <p className="mt-3 text-[12px] font-medium text-rose-600">
                    {draftError}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={saveLimit}
                    className="h-9 rounded-lg px-5 text-[13px] font-semibold text-white hover:brightness-110"
                    style={{ backgroundColor: BRAND }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftStart("");
                      setDraftEnd("");
                      setDraftEvent("No limit");
                      setDraftCustomer("No limit");
                      setDraftError("");
                      setPickerOpen(false);
                    }}
                    className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 text-[13px] font-semibold text-[#5A32A3] hover:underline"
              >
                + Add Limit
              </button>
            </div>
          </div>
        )}
      </div>

      {embedded ? null : (
        <>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50",
          )}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={saving}
          className="h-10 min-w-[96px] rounded-lg px-6 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: BRAND }}
        >
          {saving ? "Saving…" : "Next"}
        </button>
      </div>
      {saveError ? (
        <p className="mt-3 text-center text-[12px] font-medium text-rose-600">
          {saveError}
        </p>
      ) : null}
        </>
      )}
    </div>
  );
}
