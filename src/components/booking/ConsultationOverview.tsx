"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  Search,
  ClipboardList,
  Clock,
  FileCheck,
  Info,
  LayoutTemplate,
  SlidersHorizontal,
  Pencil,
  Send,
  Copy,
  FolderInput,
  MoreVertical,
  Share2,
  Trash2,
  X,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DescriptionEditor } from "@/components/booking/DescriptionEditor";
import {
  cleanDescriptionHtml,
  sanitizeDescriptionHtml,
} from "@/lib/booking/description-html";
import { ShareConsultationModal } from "@/components/booking/ShareConsultationModal";
import { BookingPageDesigner } from "@/components/booking/BookingPageDesigner";
import {
  BookingAdditionalSettingsStep,
  DEFAULT_ADDITIONAL_SETTINGS,
  type AdditionalSettingsValues,
} from "@/components/booking/BookingAdditionalSettingsStep";
import {
  BookingFormStep,
  bookingFormFromQuestions,
} from "@/components/booking/BookingFormStep";
import {
  AvailabilityLimitsStep,
  defaultAvailabilityLimits,
  type AvailabilityLimitsValues,
} from "@/components/booking/AvailabilityLimitsStep";
import { normalizeSlotLimit } from "@/components/booking/LimitsControls";
import {
  BookingRulesStep,
  rulesFromPage,
  rulesToPageFields,
  type BookingRulesValues,
} from "@/components/booking/BookingRulesStep";
import {
  ConsultationNotifyPanel,
  NOTIFY_PANELS,
  type NotifyPanelId,
} from "@/components/booking/ConsultationNotifyPanel";
import {
  AVAILABILITY_PANELS,
  type AvailabilityPanelId,
} from "@/components/booking/ConsultationWizardLayout";
import {
  crmEventTypeIdOf,
  patchCrmEventType,
  removeConsultationPage,
  tryCrmBooking,
  updateCrmEventType,
} from "@/lib/booking/api";
import { toast } from "@/lib/notify/toast";
import { toCrmQuestions } from "@/lib/booking/crm-questions";
import {
  OfflineLocationFields,
  initialOfflineLocation,
  resolveOfflineAddress,
  savedOfflineAddress,
  type OfflineKind,
} from "@/components/booking/OfflineLocationFields";
import { SELECT_BG, SELECT_CLASS } from "@/components/booking/select-styles";
import {
  defaultOfficeAddress,
  selectableOnlinePlatforms,
} from "@/lib/booking/meeting-platforms";
import {
  APPOINTMENT_DISTRIBUTIONS,
  ASSIGNMENT_PRIORITIES,
  clampLoadPercent,
  consultationModeLabel,
  evenConsultantLoads,
  formatBookingPrice,
  listBookingPages,
  nextBookingPageId,
  upsertBookingPage,
  type AppointmentDistribution,
  type AssignmentPriority,
  PAYMENT_TYPES,
  type BookingCurrency,
  type BookingPage,
  type PaymentType,
  type ConsultantPriority,
  type MeetingVia,
} from "@/lib/booking/types";
import {
  listAssignableOwnersLocal,
  loadWorkspaceConsultants,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";
import { FINANCE_PRIMARY_BUTTON_SM } from "@/components/finance/buttonStyles";

const BRAND = "#5A32A3";

function consultationInitials(title: string) {
  const words = title
    .trim()
    .split(/[\s._-]+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const SECTIONS = [
  {
    id: "details",
    title: "Event Type Details",
    hint: "Set the duration, payment type, and meeting mode.",
    icon: ClipboardList,
  },
  {
    id: "consultants",
    title: "Assigned Users",
    hint: "View Users who offer this event type.",
    icon: Users,
  },
  {
    id: "availability",
    title: "Availability and Limits",
    hint: "Set the date and time for this Event Type.",
    icon: Clock,
  },
  {
    id: "rules",
    title: "Scheduling Rules",
    hint: "Set buffers, notices, and intervals.",
    icon: Briefcase,
  },
  {
    id: "notify",
    title: "Notification Preferences",
    hint: "Configure email, SMS, and calendar notifications.",
    icon: Send,
  },
  {
    id: "form",
    title: "Booking Form",
    hint: "Collect Customer information during booking.",
    icon: FileCheck,
  },
  {
    id: "settings",
    title: "Additional settings",
    hint: "Assignment, cancellation, and calendar invites.",
    icon: SlidersHorizontal,
  },
  {
    id: "page",
    title: "Booking Page",
    hint: "Design the public booking site.",
    icon: LayoutTemplate,
  },
] as const;

type OverviewSection = (typeof SECTIONS)[number]["id"];

function NestedNavLinks<T extends string>({
  items,
  activeId,
  onSelect,
}: {
  items: { id: T; title: string; icon: LucideIcon }[];
  activeId: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="mb-1.5 ml-[3.25rem] mr-1 space-y-0.5 border-l border-[#EDE4F7] pl-2.5">
      {items.map((panel) => {
        const Icon = panel.icon;
        const selected = panel.id === activeId;
        return (
          <button
            key={panel.id}
            type="button"
            onClick={() => onSelect(panel.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-medium leading-snug",
              selected
                ? "bg-[#F3ECFB] text-[#5A32A3]"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {panel.title}
          </button>
        );
      })}
    </div>
  );
}

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function additionalSettingsFromPage(page: BookingPage): AdditionalSettingsValues {
  const stored = page.additionalSettings;
  return {
    ...DEFAULT_ADDITIONAL_SETTINGS,
    assignOnBook: stored?.assignOnBook ?? DEFAULT_ADDITIONAL_SETTINGS.assignOnBook,
    skipIfAssigned: stored?.skipIfAssigned ?? DEFAULT_ADDITIONAL_SETTINGS.skipIfAssigned,
    allowReschedule: page.allowReschedule ?? stored?.allowReschedule ?? true,
    rescheduleExpire: stored?.rescheduleExpire ?? 0,
    rescheduleUnit: stored?.rescheduleUnit ?? "Minutes",
    allowCancel: page.allowCancel ?? stored?.allowCancel ?? true,
    cancelExpire: stored?.cancelExpire ?? 0,
    cancelUnit: stored?.cancelUnit ?? "Minutes",
    calendarInvites: page.calendarInvites ?? stored?.calendarInvites ?? true,
    inviteNotes:
      page.inviteNotes ??
      stored?.inviteNotes ??
      DEFAULT_ADDITIONAL_SETTINGS.inviteNotes,
  };
}

function availabilityFromPage(page: BookingPage): AvailabilityLimitsValues {
  const limits = page.appointmentLimits;
  const fallback = defaultAvailabilityLimits();
  return {
    ...fallback,
    defaultHours: limits?.defaultHours ?? true,
    overrideUserHours: limits?.overrideUserHours ?? false,
    userSpecificHours: limits?.userSpecificHours ?? true,
    weekly: page.availability?.length ? page.availability : fallback.weekly,
    userHours: limits?.userHours ?? {},
    slotsPerEvent: limits?.slotsPerEvent ?? "No limit",
    slotsPerCustomer: limits?.slotsPerCustomer ?? "No limit",
    customLimits: limits?.customLimits ?? [],
  };
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourLabel =
    hours === 1 ? "1 Hour" : hours > 1 ? `${hours} Hours` : "";
  if (hourLabel && mins) return `${hourLabel} ${mins} mins`;
  if (hourLabel) return hourLabel;
  return `${mins} mins`;
}

export function paymentMode(page: BookingPage) {
  if (page.meetingVia === "in_person") return "Offline";
  if (page.meetingVia === "phone" || page.meetingVia === "video" || page.videoLink) {
    return "Online";
  }
  if (page.location) return "Offline";
  return "—";
}

/** Location choice shown as Meeting Mode. None is a dash, matching the summary. */
export function meetingModeLabel(page: BookingPage) {
  if (page.meetingVia === "in_person" || (!page.meetingVia && page.location)) {
    return savedOfflineAddress(page) || "—";
  }
  const detail = page.meetingViaDetail?.trim();
  if (!detail || detail === "None") return "—";
  return detail;
}

function currencyPrefix(currency: BookingCurrency = "AUD") {
  if (currency === "NPR" || currency === "INR") return "Rs";
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return "A$";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-[14px] font-semibold text-slate-900">
        {children}
      </div>
    </div>
  );
}

function Avatar({
  name,
  cover,
  size = "md",
}: {
  name: string;
  cover?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-10 w-10 rounded-lg text-[11px]" : "h-11 w-11 rounded-xl text-[12px]";
  if (cover) {
    return (
      <span className={cn("flex shrink-0 overflow-hidden", box)}>
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-bold text-white",
        box,
      )}
      style={{ backgroundColor: BRAND }}
    >
      {consultationInitials(name)}
    </span>
  );
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB]">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "h-9 min-w-[4.5rem] px-3 text-[13px] font-semibold",
            value === option
              ? "bg-[#F3ECFB] text-[#5A32A3]"
              : "bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function PaymentTypeField({
  value,
  onChange,
}: {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const options = PAYMENT_TYPES.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <p className="mb-1.5 text-[12px] font-medium text-slate-500">Payment Type</p>
      <button
        type="button"
        aria-label="Payment Type"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(SELECT_CLASS, "text-left")}
        style={{ backgroundImage: SELECT_BG }}
      >
        {value}
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
          <div className="relative border-b border-slate-100">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search payment types"
              className="h-10 w-full pr-3 pl-8 text-[13px] outline-none"
            />
          </div>
          <ul role="listbox" className="py-1">
            {options.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item === value}
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-[13px]",
                    item === value
                      ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {item}
                </button>
              </li>
            ))}
            {options.length === 0 ? (
              <li className="px-3 py-3 text-[12px] text-slate-400">No matches</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function EventTypeEditForm({
  page,
  onCancel,
  onSaved,
}: {
  page: BookingPage;
  onCancel: () => void;
  onSaved: (page: BookingPage) => void;
}) {
  const duration = page.durationMinutes || 30;
  const [name, setName] = useState(page.title);
  const [hours, setHours] = useState(Math.floor(duration / 60));
  const [minutes, setMinutes] = useState(duration % 60);
  const [paymentType, setPaymentType] = useState<PaymentType>(
    page.paymentType ?? "Optional",
  );
  const [isFree, setIsFree] = useState(!(page.price && page.price > 0));
  const [priceDraft, setPriceDraft] = useState(
    page.price && page.price > 0 ? String(page.price) : "0",
  );
  const [place, setPlace] = useState<"Online" | "Offline">(
    page.meetingVia === "in_person" ? "Offline" : "Online",
  );
  const [platform, setPlatform] = useState(
    page.meetingVia === "phone"
      ? "Phone"
      : page.meetingVia !== "in_person" &&
          page.meetingViaDetail &&
          page.meetingViaDetail !== "Office address"
        ? page.meetingViaDetail
        : "None",
  );
  // The office address comes from the company profile; an in-person event type
  // keeps either that or a custom address of its own.
  const officeAddress = useMemo(() => defaultOfficeAddress(), []);
  const [offlineStart] = useState(() =>
    initialOfflineLocation(savedOfflineAddress(page), officeAddress),
  );
  const [offlineKind, setOfflineKind] = useState<OfflineKind>(offlineStart.kind);
  const [customAddress, setCustomAddress] = useState(offlineStart.custom);
  const [addressMissing, setAddressMissing] = useState(false);
  const [isPublic, setIsPublic] = useState(
    page.isPublic ?? page.status === "Live",
  );
  const [isActive, setIsActive] = useState(page.status === "Live");
  const [description, setDescription] = useState(page.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const platforms = useMemo(() => ["None", ...selectableOnlinePlatforms(), "Phone"], []);
  const minuteChoices = MINUTE_OPTIONS.includes(minutes)
    ? MINUTE_OPTIONS
    : [...MINUTE_OPTIONS, minutes].sort((a, b) => a - b);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Event type name is required");
      return;
    }
    const durationMinutes = Math.max(5, hours * 60 + minutes);
    const paidAmount = Number(priceDraft);
    if (!isFree && (!Number.isFinite(paidAmount) || paidAmount <= 0)) {
      setError("Enter a price for paid event types");
      return;
    }
    const meetingPlace =
      place === "Offline" ? "offline" : platform === "Phone" ? "phone" : "online";
    const offlineAddress =
      meetingPlace === "offline"
        ? resolveOfflineAddress(offlineKind, officeAddress, customAddress)
        : "";
    if (meetingPlace === "offline" && offlineKind === "custom" && !offlineAddress) {
      setAddressMissing(true);
      setError("");
      return;
    }
    if (meetingPlace === "offline" && offlineKind === "office" && !offlineAddress) {
      setError("Default office address is missing");
      return;
    }
    const meetingVia: MeetingVia =
      meetingPlace === "offline"
        ? "in_person"
        : meetingPlace === "phone"
          ? "phone"
          : "video";
    // Only the formatting the editor offers is kept, and an emptied editor saves as empty.
    const savedDescription = cleanDescriptionHtml(description);
    const next: BookingPage = {
      ...page,
      title: trimmed,
      durationMinutes,
      price: isFree ? 0 : paidAmount,
      paymentType,
      description: savedDescription,
      status: isActive ? "Live" : "Draft",
      isPublic,
      meetingVia,
      meetingViaDetail:
        meetingPlace === "offline"
          ? offlineAddress || undefined
          : platform === "None"
            ? undefined
            : platform,
      location:
        meetingPlace === "offline" && offlineAddress ? offlineAddress : undefined,
    };
    setSaving(true);
    setError("");
    const crmId = crmEventTypeIdOf(page);
    if (crmId) {
      const updated = await tryCrmBooking(() =>
        updateCrmEventType(crmId, {
          name: trimmed,
          durationMinutes,
          description: savedDescription,
          active: isActive,
          isPublic,
          meetingPlace,
          platform: platform === "None" ? "Zoom" : platform,
          locationDetail:
            meetingPlace === "offline"
              ? offlineAddress
              : platform === "Phone"
                ? "Phone"
                : undefined,
        }),
      );
      if (!updated) {
        setSaving(false);
        setError("Could not save to CRM. Check the fields and try again.");
        return;
      }
      next.slug = updated.slug || next.slug;
      next.crmEventTypeId = updated.id;
    }
    setSaving(false);
    onSaved(next);
  }

  return (
    <div className="px-5 py-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name || page.title} cover={page.coverImageUrl} />
          <p className="truncate text-[16px] font-bold text-slate-900">
            {name.trim() || page.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={cn(
              FINANCE_PRIMARY_BUTTON_SM,
              "h-9 rounded-lg px-4 text-[13px] disabled:opacity-60",
            )}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-x-10 gap-y-5 sm:grid-cols-2">
        <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-500">
            Event Type Name <span className="text-rose-500">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/45"
          />
        </label>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">Price</p>
          <div className="flex items-center gap-2">
            <Segment
              value={isFree ? "Free" : "Paid"}
              options={["Paid", "Free"]}
              onChange={(value) => {
                const nextFree = value === "Free";
                setIsFree(nextFree);
                if (nextFree) setPriceDraft("0");
              }}
            />
            <span className="text-[13px] font-medium text-slate-500">
              {currencyPrefix(page.currency)}
            </span>
            <input
              value={priceDraft}
              disabled={isFree}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.]/g, "");
                setPriceDraft(raw);
                if (raw && Number(raw) > 0) setIsFree(false);
              }}
              className="h-9 w-20 rounded-lg border border-[#E5E7EB] px-2 text-[13px] text-slate-800 outline-none disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">
            Payment Mode
          </p>
          <p className="flex h-10 items-center text-[14px] font-semibold text-slate-900">
            {place}
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">Visibility</p>
          <Segment
            value={isPublic ? "Public" : "Private"}
            options={["Public", "Private"]}
            onChange={(value) => setIsPublic(value === "Public")}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">
            Description
          </p>
          <DescriptionEditor
            key={page.id}
            value={description}
            onChange={setDescription}
          />
        </div>
        </div>

        <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">Duration</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className={SELECT_CLASS}
              style={{ backgroundImage: SELECT_BG }}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i} value={i}>
                  {i} {i === 1 ? "Hour" : "Hours"}
                </option>
              ))}
            </select>
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={SELECT_CLASS}
              style={{ backgroundImage: SELECT_BG }}
            >
              {minuteChoices.map((m) => (
                <option key={m} value={m}>
                  {m} Minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        <PaymentTypeField value={paymentType} onChange={setPaymentType} />

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">
            Meeting Mode
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Segment
              value={place}
              options={["Online", "Offline"]}
              onChange={(value) => setPlace(value as "Online" | "Offline")}
            />
            {place === "Offline" ? (
              <OfflineLocationFields
                kind={offlineKind}
                onKindChange={(kind) => {
                  setOfflineKind(kind);
                  setAddressMissing(false);
                  setError("");
                }}
                officeAddress={officeAddress}
                address={customAddress}
                onAddressChange={(address) => {
                  setCustomAddress(address);
                  if (address.trim()) {
                    setAddressMissing(false);
                    setError("");
                  }
                }}
                invalid={addressMissing && !customAddress.trim()}
              />
            ) : (
              <select
                aria-label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className={cn(SELECT_CLASS, "max-w-[10rem]")}
                style={{ backgroundImage: SELECT_BG }}
              >
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">Status</p>
          <Segment
            value={isActive ? "Active" : "Inactive"}
            options={["Active", "Inactive"]}
            onChange={(value) => setIsActive(value === "Active")}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-500">
            Integration
          </span>
          <input
            readOnly
            value={page.calendlyEventTypeId ? "Calendly" : "Not Integrated"}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-slate-50 px-3 text-[13px] text-slate-500"
          />
        </label>
        </div>
      </div>
      {error ? <p className="mt-4 text-[13px] text-rose-600">{error}</p> : null}
    </div>
  );
}

function AssignedUsersEditForm({
  page,
  people,
  onCancel,
  onSaved,
}: {
  page: BookingPage;
  people: string[];
  onCancel: () => void;
  onSaved: (page: BookingPage) => void;
}) {
  const [distribution, setDistribution] = useState<AppointmentDistribution>(
    page.appointmentDistribution ?? "Default",
  );
  const [loads, setLoads] = useState<Record<string, number>>(() =>
    people.reduce(
      (acc, name) => {
        acc[name] = page.consultantLoads?.[name] ?? evenConsultantLoads(people)[name] ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    ),
  );
  const [priorities, setPriorities] = useState<Record<string, ConsultantPriority>>(
    () =>
      people.reduce(
        (acc, name) => {
          acc[name] = page.consultantPriorities?.[name] ?? "Highest";
          return acc;
        },
        {} as Record<string, ConsultantPriority>,
      ),
  );
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkPriority, setBulkPriority] = useState<AssignmentPriority | "">("");
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadBased = distribution === "Load based";
  const priorityBased = distribution === "Priority-based";
  const allChecked = people.length > 0 && people.every((name) => checked.includes(name));

  useEffect(() => {
    let alive = true;
    void loadWorkspaceConsultants()
      .then((rows) => {
        if (alive && rows.length) setOwners(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const rows = people.map((name) => {
    const owner =
      owners.find((item) => item.name === name) ||
      owners.find(
        (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
    return {
      name,
      email: owner?.email || "",
    };
  });

  function changeDistribution(next: AppointmentDistribution) {
    setDistribution(next);
    setError("");
    if (next === "Load based") {
      setLoads((current) => {
        const hasAny = people.some((name) => current[name] != null);
        return hasAny ? current : evenConsultantLoads(people);
      });
    }
    if (next === "Priority-based") {
      setPriorities((current) => {
        const nextPriorities = { ...current };
        for (const name of people) {
          if (!nextPriorities[name]) nextPriorities[name] = "Highest";
        }
        return nextPriorities;
      });
    }
  }

  function toggleAll() {
    setChecked(allChecked ? [] : [...people]);
  }

  function applyBulkPriority(value: AssignmentPriority | "") {
    setBulkPriority(value);
    if (!value) return;
    const targets = checked.length ? checked : people;
    setPriorities((current) => {
      const next = { ...current };
      for (const name of targets) next[name] = value;
      return next;
    });
  }

  async function save() {
    if (loadBased) {
      const total = people.reduce((sum, name) => sum + (loads[name] ?? 0), 0);
      if (people.length && total !== 100) {
        setError("Load shares must add up to 100%.");
        return;
      }
    }
    const next: BookingPage = {
      ...page,
      consultants: people,
      appointmentDistribution: distribution,
      consultantLoads: loadBased ? { ...loads } : page.consultantLoads,
      consultantPriorities: priorityBased ? { ...priorities } : page.consultantPriorities,
    };
    setSaving(true);
    setError("");
    const crmId = crmEventTypeIdOf(page);
    if (crmId) {
      const updated = await tryCrmBooking(() =>
        patchCrmEventType(crmId, {
          assignRoundRobin: distribution === "Round robin",
        }),
      );
      if (!updated) {
        setSaving(false);
        setError("Could not save assignment to CRM. Try again.");
        return;
      }
    }
    setSaving(false);
    onSaved(next);
  }

  return (
    <div className="px-5 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-slate-700">
            Appointment Distribution
          </span>
          <select
            value={distribution}
            onChange={(e) =>
              changeDistribution(e.target.value as AppointmentDistribution)
            }
            className={cn(SELECT_CLASS, "w-[200px]")}
            style={{ backgroundImage: SELECT_BG }}
          >
            {APPOINTMENT_DISTRIBUTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={cn(
              FINANCE_PRIMARY_BUTTON_SM,
              "h-9 rounded-lg px-4 text-[13px] disabled:opacity-60",
            )}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {priorityBased ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-slate-500">
            Select multiple users to apply the same priority.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
              />
              Select All
            </label>
            <select
              value={bulkPriority}
              aria-label="Apply priority to selected users"
              onChange={(e) =>
                applyBulkPriority(e.target.value as AssignmentPriority | "")
              }
              className={cn(SELECT_CLASS, "w-[140px]")}
              style={{ backgroundImage: SELECT_BG }}
            >
              <option value="">Select</option>
              {ASSIGNMENT_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-3 px-3 py-3"
          >
            {priorityBased ? (
              <input
                type="checkbox"
                checked={checked.includes(row.name)}
                onChange={() =>
                  setChecked((current) =>
                    current.includes(row.name)
                      ? current.filter((name) => name !== row.name)
                      : [...current, row.name],
                  )
                }
                className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
                aria-label={`Select ${row.name}`}
              />
            ) : null}
            <Avatar name={row.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {row.name}
              </p>
            </div>
            <p className="min-w-0 flex-1 truncate text-[13px] text-slate-500">
              {row.email || "—"}
            </p>
            {loadBased ? (
              <label className="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={loads[row.name] ?? 0}
                  onChange={(e) =>
                    setLoads((current) => ({
                      ...current,
                      [row.name]: clampLoadPercent(e.target.value),
                    }))
                  }
                  aria-label={`Load share for ${row.name}`}
                  className="h-9 w-[72px] rounded-lg border border-[#E5E7EB] bg-white px-2 text-right text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/45"
                />
                <span className="text-[13px] text-slate-500">%</span>
              </label>
            ) : null}
            {priorityBased ? (
              <select
                value={priorities[row.name] ?? "Highest"}
                onChange={(e) =>
                  setPriorities((current) => ({
                    ...current,
                    [row.name]: e.target.value as ConsultantPriority,
                  }))
                }
                aria-label={`Priority for ${row.name}`}
                className={cn(SELECT_CLASS, "w-[140px] shrink-0")}
                style={{ backgroundImage: SELECT_BG }}
              >
                {ASSIGNMENT_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 text-[13px] text-rose-600">{error}</p> : null}
    </div>
  );
}

function HeaderMenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
        danger ? "text-rose-600" : "text-slate-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function ConsultationOverview({
  page,
  onClose,
  onSaved,
  onRefresh,
}: {
  page: BookingPage;
  onClose: () => void;
  onSaved: (page: BookingPage) => void;
  onRefresh?: () => void;
}) {
  const [section, setSection] = useState<OverviewSection>("details");
  const [availabilityPanel, setAvailabilityPanel] =
    useState<AvailabilityPanelId>("dates");
  const [notifyPanel, setNotifyPanel] = useState<NotifyPanelId>("email");
  const [editing, setEditing] = useState<"details" | "consultants" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const mode = consultationModeLabel(page.consultationMode) || "One on One";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const current = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
  const publicLabel = page.isPublic ?? page.status === "Live";
  const pageRef = useRef(page);
  const onSavedRef = useRef(onSaved);
  pageRef.current = page;
  onSavedRef.current = onSaved;
  const persistAvailability = useCallback((values: AvailabilityLimitsValues) => {
    const currentPage = pageRef.current;
    onSavedRef.current({
      ...currentPage,
      availability: values.weekly,
      appointmentLimits: {
        defaultHours: values.defaultHours,
        overrideUserHours: values.overrideUserHours,
        userSpecificHours: values.userSpecificHours,
        // A "Per day" with no number typed yet is not a limit; don't save it as one.
        slotsPerEvent: normalizeSlotLimit(values.slotsPerEvent),
        slotsPerCustomer: normalizeSlotLimit(values.slotsPerCustomer),
        customLimits: values.customLimits,
        userHours: values.userHours,
      },
    });
  }, []);
  const persistRules = useCallback((rules: BookingRulesValues) => {
    const currentPage = pageRef.current;
    const group = currentPage.consultationMode === "group";
    const fields = rulesToPageFields(rules, {
      durationMinutes: currentPage.durationMinutes,
      group,
    });
    onSavedRef.current({
      ...currentPage,
      bufferMinutes: fields.bufferMinutes,
      minNoticeHours: fields.minNoticeHours,
      maxAdvanceDays: fields.maxAdvanceDays,
      // Only group consultations edit capacity here; leave everyone else's alone.
      ...(group ? { maxAttendees: fields.maxAttendees } : {}),
      schedulingRules: fields.schedulingRules,
    });
  }, []);
  const consultantUserIds = useMemo(() => {
    const ids: Record<string, string> = {};
    for (const name of people) {
      const owner =
        owners.find((item) => item.name === name) ||
        owners.find(
          (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
      if (owner?.id) ids[name] = owner.id;
    }
    return ids;
  }, [owners, people]);

  useEffect(() => {
    const stored = listBookingPages().find(
      (item) =>
        item.id === page.id ||
        (page.crmEventTypeId && item.crmEventTypeId === page.crmEventTypeId) ||
        item.slug === page.slug,
    );
    const storedCount = stored?.consultants?.filter(Boolean).length ?? 0;
    const currentCount = page.consultants?.filter(Boolean).length ?? 0;
    if (currentCount > storedCount) upsertBookingPage(page);
  }, [page]);

  useEffect(() => {
    let alive = true;
    void loadWorkspaceConsultants()
      .then((rows) => {
        if (alive && rows.length) setOwners(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E4E0EE] bg-white shadow-[0_1px_2px_rgba(90,50,163,0.06)]">
      <div className="h-[3px] shrink-0 bg-[#6A43A0]" />
      <header className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-[#EEEAF4] bg-white px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#C9BDF0] bg-[#B3A6EB] text-[13px] font-bold tracking-wide text-[#4E3A78]">
            {consultationInitials(page.title)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-5 font-bold text-slate-900">
              {page.title}
            </p>
            <p className="truncate text-[12px] leading-4 text-slate-500">{mode}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#5A32A3]/40 bg-white px-3 text-[13px] font-semibold text-[#5A32A3] hover:bg-[#F6F1FC]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute top-9 right-0 z-30 w-44 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                <HeaderMenuRow
                  icon={Copy}
                  label="Make a copy"
                  onClick={() => {
                    setMenuOpen(false);
                    upsertBookingPage({
                      ...page,
                      id: nextBookingPageId(),
                      title: `${page.title} (copy)`,
                      slug: `${page.slug}-copy`.slice(0, 48),
                      crmEventTypeId: undefined,
                      views: 0,
                      bookingsCount: 0,
                      createdAt: new Date().toLocaleDateString("en-GB"),
                    });
                    onRefresh?.();
                  }}
                />
                <HeaderMenuRow
                  icon={FolderInput}
                  label="Move"
                  onClick={() => {
                    const next =
                      page.status === "Live"
                        ? window.confirm("Move this consultation to Draft?")
                          ? "Draft"
                          : null
                        : window.confirm("Move this consultation to Active?")
                          ? "Live"
                          : null;
                    if (!next) return;
                    setMenuOpen(false);
                    onSaved({ ...page, status: next });
                  }}
                />
                <HeaderMenuRow
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    if (!window.confirm(`Delete “${page.title}”?`)) return;
                    void (async () => {
                      try {
                        await removeConsultationPage(page);
                        setMenuOpen(false);
                        onRefresh?.();
                        onClose();
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Could not delete this consultation.",
                        );
                      }
                    })();
                  }}
                />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-[#EEEAF4] lg:h-full lg:max-h-full lg:w-[280px] lg:border-r lg:border-b-0">
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#FCFAFE] p-2">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = item.id === section;
              const availabilityOpen = section === "availability";
              const notifyOpen = section === "notify";
              return (
                <div key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setEditing(null);
                    if (item.id === "availability") setAvailabilityPanel("dates");
                    if (item.id === "notify") setNotifyPanel("email");
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition",
                    active &&
                      !(item.id === "availability" && availabilityOpen) &&
                      !(item.id === "notify" && notifyOpen)
                      ? "bg-[#F3ECFB]"
                      : "hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-[#F3ECFB] text-[#5A32A3]"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold",
                        active ? "text-[#5A32A3]" : "text-slate-800",
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      {item.hint}
                    </span>
                  </span>
                  {item.id === "availability" || item.id === "notify" ? (
                    <ChevronDown
                      className={cn(
                        "mt-2 h-4 w-4 shrink-0 text-slate-400 transition-transform",
                        (item.id === "availability" ? availabilityOpen : notifyOpen) &&
                          "rotate-180 text-[#5A32A3]",
                      )}
                    />
                  ) : null}
                </button>
                {item.id === "notify" && notifyOpen ? (
                  <NestedNavLinks
                    items={[...NOTIFY_PANELS]}
                    activeId={notifyPanel}
                    onSelect={(id) => {
                      setSection("notify");
                      setNotifyPanel(id);
                    }}
                  />
                ) : null}
                {item.id === "availability" && availabilityOpen ? (
                  <NestedNavLinks
                    items={[...AVAILABILITY_PANELS]}
                    activeId={availabilityPanel}
                    onSelect={(id) => {
                      setSection("availability");
                      setAvailabilityPanel(id);
                    }}
                  />
                ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 bg-white",
            section === "page" ? "flex flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {section !== "availability" &&
          section !== "notify" &&
          section !== "form" &&
          section !== "page" ? (
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-slate-900">
                {current.title}
              </h2>
              {section === "consultants" ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F3ECFB] px-1.5 text-[11px] font-bold text-[#5A32A3]">
                  {people.length}
                </span>
              ) : null}
              <span className="text-slate-300" title={current.hint}>
                <Info className="h-4 w-4" />
              </span>
            </div>
            {section === "details" && editing !== "details" ? (
              <button
                type="button"
                onClick={() => setEditing("details")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
            {section === "consultants" && editing !== "consultants" ? (
              <button
                type="button"
                onClick={() => setEditing("consultants")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
          </div>
          ) : null}

          {section === "details" && editing === "details" ? (
            <EventTypeEditForm
              key={page.id}
              page={page}
              onCancel={() => setEditing(null)}
              onSaved={(next) => {
                setEditing(null);
                onSaved(next);
              }}
            />
          ) : null}

          {section === "details" && editing !== "details" ? (
            <div className="px-5 py-5">
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#E4E0EE] bg-[#FCFAFE] px-4 py-3">
                <Avatar name={page.title} cover={page.coverImageUrl} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-slate-900">
                    {page.title}
                  </p>
                  <p className="truncate text-[12px] text-slate-500">{mode}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
                <Field label="Event Type Name">{page.title}</Field>
                <Field label="Duration">
                  {formatDuration(page.durationMinutes || 30)}
                </Field>
                <Field label="Price">
                  {formatBookingPrice(page.price, page.currency ?? "AUD")}
                </Field>
                <Field label="Payment Type">{page.paymentType ?? "Optional"}</Field>
                <Field label="Payment Mode">{paymentMode(page)}</Field>
                <Field label="Meeting Mode">{meetingModeLabel(page)}</Field>
                <Field label="Visibility">
                  {publicLabel ? "Public" : "Private"}
                </Field>
                <Field label="Status">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold",
                      page.status === "Live"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {page.status === "Live" ? "Active" : "Inactive"}
                  </span>
                </Field>
                <Field label="Description">
                  {page.description?.trim() ? (
                    <div
                      className="fc-rich-editor font-normal [&_a]:text-[#5A32A3] [&_a]:underline [&_p]:m-0"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeDescriptionHtml(page.description),
                      }}
                    />
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Integration">
                  {page.calendlyEventTypeId ? "Calendly" : "Not Integrated"}
                </Field>
              </div>
            </div>
          ) : null}

          {section === "consultants" && editing === "consultants" ? (
            <AssignedUsersEditForm
              key={`${page.id}-users`}
              page={page}
              people={people}
              onCancel={() => setEditing(null)}
              onSaved={(next) => {
                setEditing(null);
                onSaved(next);
              }}
            />
          ) : null}

          {section === "consultants" && editing !== "consultants" ? (
            <div className="px-5 py-5">
              <p className="mb-4 text-[13px] text-slate-500">
                Appointment Distribution:{" "}
                <span className="font-semibold text-slate-800">
                  {page.appointmentDistribution ?? "Default"}
                </span>
              </p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
                {people.map((name) => {
                  const owner =
                    owners.find((item) => item.name === name) ||
                    owners.find(
                      (item) =>
                        item.name.trim().toLowerCase() === name.trim().toLowerCase(),
                    );
                  return (
                    <div key={name} className="flex items-center gap-3 px-3 py-3">
                      <Avatar name={name} />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">
                        {name}
                      </p>
                      <p className="min-w-0 flex-1 truncate text-[13px] text-slate-500">
                        {owner?.email || "—"}
                      </p>
                      {page.appointmentDistribution === "Load based" ? (
                        <p className="shrink-0 text-[13px] text-slate-600">
                          {page.consultantLoads?.[name] ?? 0} %
                        </p>
                      ) : null}
                      {page.appointmentDistribution === "Priority-based" ? (
                        <p className="shrink-0 text-[13px] text-slate-600">
                          {page.consultantPriorities?.[name] ?? "Highest"}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {section === "availability" ? (
            <AvailabilityLimitsStep
              embedded
              panel={availabilityPanel}
              consultants={people}
              consultantUserIds={consultantUserIds}
              initial={availabilityFromPage(page)}
              timezone={page.timezone}
              onTimezoneChange={(zone) =>
                // Saved with the page; the hours are re-synced in this zone on Save.
                onSavedRef.current({ ...pageRef.current, timezone: zone })
              }
              onChange={persistAvailability}
              onBack={() => setSection("consultants")}
              onNext={(values) => persistAvailability(values)}
            />
          ) : null}

          {section === "rules" ? (
            <BookingRulesStep
              // Start from this page's saved values; the form owns them while open.
              key={page.id}
              embedded
              group={page.consultationMode === "group"}
              initial={rulesFromPage(page)}
              onChange={persistRules}
            />
          ) : null}

          {section === "notify" ? (
            <ConsultationNotifyPanel
              panel={notifyPanel}
              page={page}
              onSaved={onSaved}
            />
          ) : null}

          {section === "settings" ? (
            <BookingAdditionalSettingsStep
              key={page.id}
              initial={additionalSettingsFromPage(page)}
              onBack={() => setSection("form")}
              finishLabel="Save"
              onFinish={(values) => {
                onSaved({
                  ...page,
                  allowReschedule: values.allowReschedule,
                  allowCancel: values.allowCancel,
                  calendarInvites: values.calendarInvites,
                  inviteNotes: values.inviteNotes,
                  additionalSettings: values,
                });
              }}
            />
          ) : null}

          {section === "page" ? <BookingPageDesigner key={page.id} page={page} /> : null}

          {section === "form" ? (
            <BookingFormStep
              key={page.id}
              embedded
              initial={bookingFormFromQuestions(page.questions, page)}
              onNext={(values) => {
                const questions = values.fields.map((field) => ({
                  id: field.id,
                  label: field.label,
                  required: field.required,
                  hidden: field.hidden,
                  fieldType: field.type,
                  ephi: field.ephi,
                  options: field.options,
                  addressParts: field.addressParts,
                }));
                onSaved({
                  ...page,
                  questions,
                  termsEnabled: values.terms,
                  termsHtml: values.termsText,
                  confirmationTemplate: values.freeButton,
                });
                // The CRM keeps the form for every browser and the guest page,
                // and lists each custom field under Settings → Custom Fields.
                const crmId = crmEventTypeIdOf(page);
                if (crmId) {
                  void patchCrmEventType(crmId, { questions: toCrmQuestions(questions) }).catch(
                    (err: unknown) => {
                      toast.error(
                        err instanceof Error
                          ? `The form was saved here, but not in the CRM: ${err.message}`
                          : "The form was saved here, but not in the CRM.",
                      );
                    },
                  );
                }
              }}
            />
          ) : null}
        </section>
      </div>
      </div>

      {shareOpen ? (
        <ShareConsultationModal
          title={page.title}
          slug={page.slug}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}
