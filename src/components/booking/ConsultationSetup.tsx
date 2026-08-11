"use client";

import { useMemo, useState } from "react";
import {
  Users,
  UserRound,
  UsersRound,
  Monitor,
  ImageIcon,
  Video,
  Phone,
  MapPin,
  Type,
  CalendarClock,
  Check,
  Search,
} from "lucide-react";
import {
  BOOKING_CONSULTANTS,
  BOOKING_CURRENCIES,
  CONSULTATION_MODE_META,
  CONSULTATION_MODES,
  consultantsAllowMultiple,
  type BookingCurrency,
  type ConsultationMode,
  type MeetingMode,
  type MeetingVia,
} from "@/lib/booking/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  Field,
  InputShell,
  elevatedInputClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

const MODE_META: Record<
  ConsultationMode,
  { icon: React.ElementType; soft: string; text: string }
> = {
  one_to_one: {
    icon: UserRound,
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
  group: { icon: Users, soft: "bg-violet-50", text: "text-violet-700" },
  collective: {
    icon: UsersRound,
    soft: "bg-sky-50",
    text: "text-sky-700",
  },
  resource: {
    icon: Monitor,
    soft: "bg-amber-50",
    text: "text-amber-800",
  },
};

const VIA_META: Record<
  MeetingVia,
  { label: string; icon: React.ElementType; placeholder: string }
> = {
  video: {
    label: "Video",
    icon: Video,
    placeholder: "https://meet.google.com/…",
  },
  phone: { label: "Phone", icon: Phone, placeholder: "+61 400 000 000" },
  in_person: {
    label: "In person",
    icon: MapPin,
    placeholder: "Office address or room",
  },
  custom: {
    label: "Custom",
    icon: Type,
    placeholder: "How guests will join",
  },
};

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export interface ConsultationSetupValue {
  consultationMode: ConsultationMode | "";
  meetingMode: MeetingMode;
  title: string;
  durationMinutes: number;
  coverImageUrl: string;
  price: number;
  currency: BookingCurrency;
  isFree: boolean;
  meetingVia: MeetingVia;
  meetingViaDetail: string;
  maxAttendees: number;
  consultants: string[];
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
        active
          ? "bg-violet-600 text-white shadow-sm shadow-violet-600/25"
          : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200",
      )}
    >
      {label}
    </button>
  );
}

export function ConsultationSetup({
  value,
  errors,
  onChange,
  onTitleChange,
}: {
  value: ConsultationSetupValue;
  errors: Record<string, string>;
  onChange: (patch: Partial<ConsultationSetupValue>) => void;
  onTitleChange: (title: string) => void;
}) {
  const mode = value.consultationMode;
  const showFrequency = mode
    ? CONSULTATION_MODE_META[mode].showFrequency
    : true;
  const multi = consultantsAllowMultiple(mode || undefined);
  const [consultantQuery, setConsultantQuery] = useState("");

  const filteredConsultants = useMemo(() => {
    const q = consultantQuery.trim().toLowerCase();
    if (!q) return BOOKING_CONSULTANTS;
    return BOOKING_CONSULTANTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [consultantQuery]);

  function selectMode(next: ConsultationMode) {
    const showFreq = CONSULTATION_MODE_META[next].showFrequency;
    const allowMulti = CONSULTATION_MODE_META[next].multiConsultant;
    onChange({
      consultationMode: next,
      meetingMode: showFreq ? value.meetingMode : "one_time",
      consultants: allowMulti
        ? value.consultants
        : value.consultants.slice(0, 1),
    });
  }

  function toggleConsultant(name: string) {
    if (multi) {
      const has = value.consultants.includes(name);
      onChange({
        consultants: has
          ? value.consultants.filter((n) => n !== name)
          : [...value.consultants, name],
      });
      return;
    }
    onChange({
      consultants: value.consultants[0] === name ? [] : [name],
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
          Consultation type
        </p>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {CONSULTATION_MODES.map((id) => {
            const item = CONSULTATION_MODE_META[id];
            const visual = MODE_META[id];
            const Icon = visual.icon;
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectMode(id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all",
                  active
                    ? "border-violet-300 bg-violet-50 shadow-[0_0_0_2px_rgba(139,92,246,0.12)]"
                    : "border-slate-200 bg-white hover:border-violet-200",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    visual.soft,
                    visual.text,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-slate-900">
                    {item.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.consultationMode ? (
          <p className="mt-1 text-[11px] font-medium text-rose-500">
            {errors.consultationMode}
          </p>
        ) : null}
      </div>

      {mode ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {showFrequency ? (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                  Meetings mode
                </p>
                <div className="flex flex-wrap gap-1">
                  <Chip
                    active={value.meetingMode === "one_time"}
                    onClick={() => onChange({ meetingMode: "one_time" })}
                    label="One Time"
                  />
                  <Chip
                    active={value.meetingMode === "recurring"}
                    onClick={() => onChange({ meetingMode: "recurring" })}
                    label="Recurring"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                Duration
              </p>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map((m) => (
                  <Chip
                    key={m}
                    active={value.durationMinutes === m}
                    onClick={() => onChange({ durationMinutes: m })}
                    label={`${m}m`}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                Price
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <Chip
                  active={value.isFree}
                  onClick={() => onChange({ isFree: true, price: 0 })}
                  label="Free"
                />
                <Chip
                  active={!value.isFree}
                  onClick={() =>
                    onChange({
                      isFree: false,
                      price: value.price > 0 ? value.price : 150,
                    })
                  }
                  label="Paid"
                />
                {!value.isFree ? (
                  <>
                    <select
                      value={value.currency}
                      onChange={(e) =>
                        onChange({
                          currency: e.target.value as BookingCurrency,
                        })
                      }
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 outline-none"
                    >
                      {BOOKING_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={value.price || ""}
                      onChange={(e) =>
                        onChange({
                          price: Number(e.target.value) || 0,
                          isFree: false,
                        })
                      }
                      placeholder="150"
                      className="h-7 w-20 rounded-md border border-slate-200 px-2 text-[11px] outline-none focus:border-violet-400"
                    />
                  </>
                ) : null}
              </div>
              {errors.price ? (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  {errors.price}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Consultation name" required error={errors.title}>
              <InputShell icon={CalendarClock} error={!!errors.title}>
                <input
                  value={value.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="e.g. Mortgage Consultation"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>

            <Field label="Title image" error={errors.coverImageUrl}>
              <InputShell icon={ImageIcon} error={!!errors.coverImageUrl}>
                <input
                  value={value.coverImageUrl}
                  onChange={(e) =>
                    onChange({ coverImageUrl: e.target.value })
                  }
                  placeholder="https://… image URL"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                Meeting via
              </p>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(VIA_META) as MeetingVia[]).map((via) => {
                  const item = VIA_META[via];
                  const Icon = item.icon;
                  const active = value.meetingVia === via;
                  return (
                    <button
                      key={via}
                      type="button"
                      onClick={() => onChange({ meetingVia: via })}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] font-semibold transition-all",
                        active
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-violet-200",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <InputShell icon={VIA_META[value.meetingVia].icon}>
                  <input
                    value={value.meetingViaDetail}
                    onChange={(e) =>
                      onChange({ meetingViaDetail: e.target.value })
                    }
                    placeholder={VIA_META[value.meetingVia].placeholder}
                    className={elevatedInputClass(true)}
                  />
                </InputShell>
                {errors.meetingViaDetail ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.meetingViaDetail}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-700">
                  Assign consultant{multi ? "s" : ""}
                </p>
                {value.consultants.length > 0 ? (
                  <span className="text-[10px] font-semibold text-violet-600">
                    {value.consultants.length} selected
                  </span>
                ) : null}
              </div>
              <InputShell icon={Search}>
                <input
                  value={consultantQuery}
                  onChange={(e) => setConsultantQuery(e.target.value)}
                  placeholder="Search…"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
              <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-slate-200">
                {filteredConsultants.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11px] text-slate-400">
                    No matches
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filteredConsultants.map((c) => {
                      const selected = value.consultants.includes(c.name);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => toggleConsultant(c.name)}
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1.5 text-left",
                              selected ? "bg-violet-50/80" : "hover:bg-slate-50",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                                avatarColor(c.name),
                              )}
                            >
                              {initials(c.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-semibold text-slate-900">
                                {c.name}
                              </span>
                              <span className="block truncate text-[9px] text-slate-400">
                                {c.role}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center border",
                                multi ? "rounded" : "rounded-full",
                                selected
                                  ? "border-violet-600 bg-violet-600 text-white"
                                  : "border-slate-300 bg-white",
                              )}
                            >
                              {selected ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {errors.consultants ? (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  {errors.consultants}
                </p>
              ) : null}
              {value.consultants.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {value.consultants.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleConsultant(name)}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                    >
                      {name.split(" ")[0]}
                      <span className="text-violet-400">×</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {mode === "group" ? (
            <Field label="Max attendees" error={errors.maxAttendees}>
              <InputShell icon={Users} error={!!errors.maxAttendees}>
                <input
                  type="number"
                  min={2}
                  value={value.maxAttendees || ""}
                  onChange={(e) =>
                    onChange({ maxAttendees: Number(e.target.value) || 0 })
                  }
                  placeholder="e.g. 20"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </Field>
          ) : null}
        </>
      ) : (
        <p className="text-[11px] text-slate-400">
          Select a consultation type to continue.
        </p>
      )}
    </div>
  );
}
