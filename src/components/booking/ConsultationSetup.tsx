"use client";

import { useMemo, useRef, useState } from "react";
import {
  Users,
  UserRound,
  UsersRound,
  Monitor,
  Camera,
  Video,
  Phone,
  MapPin,
  Type,
  CalendarClock,
  Clock,
  DollarSign,
  Repeat,
  Check,
  Search,
} from "lucide-react";
import {
  BOOKING_CONSULTANTS,
  BOOKING_CURRENCIES,
  CONSULTANT_PRIORITIES,
  CONSULTATION_MODE_META,
  CONSULTATION_MODES,
  consultantsAllowMultiple,
  type BookingCurrency,
  type ConsultationMode,
  type ConsultantPriority,
  type MeetingMode,
  type MeetingVia,
} from "@/lib/booking/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

const EXTRA_CONSULTANTS = [
  "Akshay",
  "Admin",
  "Pawan Regmi",
  "Bishnu Aryal",
];

const MODE_META: Record<
  ConsultationMode,
  { icon: React.ElementType }
> = {
  one_to_one: { icon: UserRound },
  group: { icon: Users },
  collective: { icon: UsersRound },
  resource: { icon: Monitor },
};

const VIA_META: Record<
  MeetingVia,
  { label: string; icon: React.ElementType; placeholder: string }
> = {
  video: {
    label: "Online",
    icon: Video,
    placeholder: "https://meet.google.com/…",
  },
  phone: { label: "Phone", icon: Phone, placeholder: "+61 400 000 000" },
  in_person: {
    label: "Offline",
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

const ALL_CONSULTANTS = [
  ...EXTRA_CONSULTANTS.map((name) => ({
    id: `extra-${name}`,
    name,
    role: "Consultant",
    email: "",
  })),
  ...BOOKING_CONSULTANTS.filter((c) => !EXTRA_CONSULTANTS.includes(c.name)),
];

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
  consultantPriorities: Record<string, ConsultantPriority>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredConsultants = useMemo(() => {
    const q = consultantQuery.trim().toLowerCase();
    if (!q) return ALL_CONSULTANTS;
    return ALL_CONSULTANTS.filter(
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

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ coverImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  const TypeIcon = mode ? MODE_META[mode].icon : UserRound;
  const ViaIcon = VIA_META[value.meetingVia].icon;

  return (
    <div className="mt-2.5 space-y-2.5">
      <div className="grid items-start gap-2.5 sm:grid-cols-2">
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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:brightness-110"
              style={{ backgroundColor: BRAND }}
              aria-label="Upload title image"
              title="Upload title image"
            >
              <Camera className="h-4 w-4" strokeWidth={2} />
              {value.coverImageUrl ? (
                <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              ) : null}
            </button>
            <div className="min-w-0 flex-1">
              <InputShell error={!!errors.coverImageUrl}>
                <input
                  value={
                    value.coverImageUrl.startsWith("data:")
                      ? "Image uploaded"
                      : value.coverImageUrl
                  }
                  onChange={(e) =>
                    onChange({ coverImageUrl: e.target.value })
                  }
                  placeholder="https://… image URL"
                  className={elevatedInputClass()}
                />
              </InputShell>
            </div>
          </div>
        </Field>
      </div>

      <div className="grid items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Consultation type" required error={errors.consultationMode}>
          <InputShell icon={TypeIcon} error={!!errors.consultationMode}>
            <select
              value={mode}
              onChange={(e) => {
                const next = e.target.value as ConsultationMode;
                if (next) selectMode(next);
              }}
              className={elevatedSelectClass(true)}
            >
              {!mode ? <option value="">Select type</option> : null}
              {CONSULTATION_MODES.map((id) => (
                <option key={id} value={id}>
                  {CONSULTATION_MODE_META[id].title}
                </option>
              ))}
            </select>
          </InputShell>
        </Field>

        {mode && showFrequency ? (
          <Field label="Meetings mode">
            <InputShell icon={Repeat}>
              <select
                value={value.meetingMode}
                onChange={(e) =>
                  onChange({ meetingMode: e.target.value as MeetingMode })
                }
                className={elevatedSelectClass(true)}
              >
                <option value="one_time">One Time</option>
                <option value="recurring">Recurring</option>
              </select>
            </InputShell>
          </Field>
        ) : null}

        {mode ? (
          <>
            <Field label="Duration">
              <InputShell icon={Clock}>
                <select
                  value={value.durationMinutes}
                  onChange={(e) =>
                    onChange({ durationMinutes: Number(e.target.value) })
                  }
                  className={elevatedSelectClass(true)}
                >
                  {DURATION_PRESETS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </InputShell>
            </Field>

            <Field
              label="Price"
              error={errors.price}
              className={value.isFree ? undefined : "lg:col-span-2"}
            >
              <div className="flex items-center gap-1.5">
                <div className={cn("min-w-0", value.isFree ? "flex-1" : "w-[8rem]")}>
                  <InputShell icon={DollarSign} error={!!errors.price}>
                    <select
                      value={value.isFree ? "free" : "paid"}
                      onChange={(e) =>
                        onChange({
                          isFree: e.target.value === "free",
                          price:
                            e.target.value === "free"
                              ? 0
                              : value.price > 0
                                ? value.price
                                : 150,
                        })
                      }
                      className={elevatedSelectClass(true)}
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </InputShell>
                </div>
                {!value.isFree ? (
                  <>
                    <select
                      value={value.currency}
                      onChange={(e) =>
                        onChange({
                          currency: e.target.value as BookingCurrency,
                        })
                      }
                      className="h-10 w-[4.5rem] shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-1.5 text-[12px] font-semibold text-slate-700 outline-none"
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
                      className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-2.5 text-[13px] outline-none focus:border-[#5A32A3]/45"
                    />
                  </>
                ) : null}
              </div>
            </Field>
          </>
        ) : null}
      </div>

      {mode ? (
        <>
          <div className="grid items-start gap-2.5 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Field label="Meeting via" error={errors.meetingViaDetail}>
                <InputShell icon={ViaIcon}>
                  <select
                    value={value.meetingVia}
                    onChange={(e) =>
                      onChange({ meetingVia: e.target.value as MeetingVia })
                    }
                    className={elevatedSelectClass(true)}
                  >
                    {(Object.keys(VIA_META) as MeetingVia[]).map((via) => (
                      <option key={via} value={via}>
                        {VIA_META[via].label}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </Field>
              <InputShell icon={ViaIcon} error={!!errors.meetingViaDetail}>
                <input
                  value={value.meetingViaDetail}
                  onChange={(e) =>
                    onChange({ meetingViaDetail: e.target.value })
                  }
                  placeholder={VIA_META[value.meetingVia].placeholder}
                  className={elevatedInputClass(true)}
                />
              </InputShell>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-slate-600">
                  Assign consultant{multi ? "s" : ""}
                </p>
                {value.consultants.length > 0 ? (
                  <span className="text-[11px] font-semibold text-[#5A32A3]">
                    {value.consultants.length} selected
                  </span>
                ) : null}
              </div>
              <InputShell icon={Search}>
                <input
                  value={consultantQuery}
                  onChange={(e) => setConsultantQuery(e.target.value)}
                  placeholder="Search consultants"
                  className={elevatedInputClass(true)}
                />
              </InputShell>
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[#E5E7EB]">
                {filteredConsultants.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[12px] text-slate-400">
                    No matches
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F3F4F6]">
                    {filteredConsultants.map((c) => {
                      const selected = value.consultants.includes(c.name);
                      const priority =
                        value.consultantPriorities[c.name] ?? "Low";
                      return (
                        <li
                          key={c.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5",
                            selected && "bg-[#F3ECFB]/70",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleConsultant(c.name)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                avatarColor(c.name),
                              )}
                            >
                              {initials(c.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-semibold text-slate-900">
                                {c.name}
                              </span>
                              <span className="block truncate text-[10px] text-slate-400">
                                {c.role}
                              </span>
                            </span>
                          </button>
                          <select
                            value={priority}
                            onChange={(e) =>
                              onChange({
                                consultantPriorities: {
                                  ...value.consultantPriorities,
                                  [c.name]: e.target
                                    .value as ConsultantPriority,
                                },
                              })
                            }
                            className="h-7 w-[108px] shrink-0 rounded-md border border-[#E5E7EB] bg-white px-1.5 text-[11px] text-slate-700 outline-none"
                            aria-label={`Priority for ${c.name}`}
                          >
                            {CONSULTANT_PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {p} priority
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => toggleConsultant(c.name)}
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center border",
                              multi ? "rounded" : "rounded-full",
                              selected
                                ? "border-[#5A32A3] bg-[#5A32A3] text-white"
                                : "border-slate-300 bg-white",
                            )}
                            aria-label={`Assign ${c.name}`}
                          >
                            {selected ? <Check className="h-2.5 w-2.5" /> : null}
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
            </div>
          </div>

          {mode === "group" ? (
            <Field label="Max attendees" error={errors.maxAttendees} className="max-w-xs">
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
        <p className="text-[12px] text-slate-400">
          Select a consultation type to continue.
        </p>
      )}
    </div>
  );
}
