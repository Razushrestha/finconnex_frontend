"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignLeft,
  Bold,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileCheck,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Send,
  Share2,
  Underline,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ShareConsultationModal } from "@/components/booking/ShareConsultationModal";
import {
  BookingFormStep,
  bookingFormFromQuestions,
} from "@/components/booking/BookingFormStep";
import {
  AvailabilityLimitsStep,
  defaultAvailabilityLimits,
  type AvailabilityLimitsValues,
} from "@/components/booking/AvailabilityLimitsStep";
import {
  ConsultationNotifyPanel,
  NOTIFY_PANELS,
  type NotifyPanelId,
} from "@/components/booking/ConsultationNotifyPanel";
import {
  AVAILABILITY_PANELS,
  type AvailabilityPanelId,
} from "@/components/booking/ConsultationWizardLayout";
import { initials } from "@/lib/activities/shared";
import {
  crmEventTypeIdOf,
  patchCrmEventType,
  tryCrmBooking,
  updateCrmEventType,
} from "@/lib/booking/api";
import { selectableOnlinePlatforms } from "@/lib/booking/meeting-platforms";
import {
  APPOINTMENT_DISTRIBUTIONS,
  consultationModeLabel,
  formatBookingPrice,
  meetingModeLabel,
  type AppointmentDistribution,
  type BookingCurrency,
  type BookingPage,
  type MeetingVia,
} from "@/lib/booking/types";
import {
  listAssignableOwnersLocal,
  loadWorkspaceConsultants,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

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

const SELECT_CLASS =
  "h-10 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/45";
const SELECT_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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

function paymentMode(page: BookingPage) {
  if (page.meetingVia === "in_person") return "Offline";
  if (page.meetingVia === "phone") return "Phone";
  if (page.meetingVia === "video") return "Online";
  return page.videoLink ? "Online" : page.location ? "Offline" : "—";
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
      {initials(name)}
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

function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // seed once per edit session via key on parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(command: string) {
    ref.current?.focus();
    document.execCommand(command, false);
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-0.5 border-b border-[#E5E7EB] px-2 py-1.5 text-slate-500">
        {[
          { icon: Bold, cmd: "bold" },
          { icon: Italic, cmd: "italic" },
          { icon: Underline, cmd: "underline" },
          { icon: AlignLeft, cmd: "justifyLeft" },
          { icon: List, cmd: "insertUnorderedList" },
          { icon: ListOrdered, cmd: "insertOrderedList" },
          { icon: Link2, cmd: "createLink" },
        ].map((item) => (
          <button
            key={item.cmd}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (item.cmd === "createLink") {
                const href = window.prompt("Link URL")?.trim();
                if (!href) return;
                document.execCommand("createLink", false, href);
                onChange(ref.current?.innerHTML ?? "");
                return;
              }
              run(item.cmd);
            }}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100"
            aria-label={item.cmd}
          >
            <item.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] px-3 py-2 text-[13px] text-slate-800 outline-none"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}

function EventTypeEditForm({
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
      : page.meetingViaDetail && page.meetingViaDetail !== "Office address"
        ? page.meetingViaDetail
        : "None",
  );
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
    const meetingVia: MeetingVia =
      meetingPlace === "offline"
        ? "in_person"
        : meetingPlace === "phone"
          ? "phone"
          : "video";
    const next: BookingPage = {
      ...page,
      title: trimmed,
      durationMinutes,
      price: isFree ? 0 : paidAmount,
      description,
      status: isActive ? "Live" : "Draft",
      isPublic,
      meetingVia,
      meetingViaDetail: platform === "None" ? undefined : platform,
      location: meetingPlace === "offline" ? page.location : undefined,
    };
    setSaving(true);
    setError("");
    const crmId = crmEventTypeIdOf(page);
    if (crmId) {
      const updated = await tryCrmBooking(() =>
        updateCrmEventType(crmId, {
          name: trimmed,
          durationMinutes,
          description,
          active: isActive,
          isPublic,
          meetingPlace,
          platform: platform === "None" ? "Zoom" : platform,
          locationDetail:
            meetingPlace === "offline"
              ? page.location || "In person"
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
            className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
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

      <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
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
            Meeting Mode
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Segment
              value={place}
              options={["Online", "Offline"]}
              onChange={(value) => setPlace(value as "Online" | "Offline")}
            />
            <select
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
          </div>
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
          <p className="mb-1.5 text-[12px] font-medium text-slate-500">Status</p>
          <Segment
            value={isActive ? "Active" : "Inactive"}
            options={["Active", "Inactive"]}
            onChange={(value) => setIsActive(value === "Active")}
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
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  async function save() {
    const next: BookingPage = {
      ...page,
      consultants: people,
      appointmentDistribution: distribution,
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
              setDistribution(e.target.value as AppointmentDistribution)
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
            className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
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

      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-3 px-3 py-3"
          >
            <Avatar name={row.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {row.name}
              </p>
            </div>
            <p className="truncate text-[13px] text-slate-500">
              {row.email || "—"}
            </p>
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 text-[13px] text-rose-600">{error}</p> : null}
    </div>
  );
}

export function ConsultationOverview({
  page,
  onClose,
  onSaved,
}: {
  page: BookingPage;
  onClose: () => void;
  onSaved: (page: BookingPage) => void;
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
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const paid = (page.price ?? 0) > 0;
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
        slotsPerEvent: values.slotsPerEvent,
        slotsPerCustomer: values.slotsPerCustomer,
        customLimits: values.customLimits,
        userHours: values.userHours,
      },
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
    <div className="-mx-3 -mt-4 flex min-h-0 flex-1 flex-col bg-[#F7F8FA] sm:-mx-5 sm:-mt-5 lg:-mx-7">
      <header className="grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[#E5E7EB] bg-white px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={page.title} cover={page.coverImageUrl} size="sm" />
          <div className="flex h-10 min-w-0 flex-col justify-center">
            <p className="truncate text-[14px] leading-5 font-semibold text-slate-900">
              {page.title}
            </p>
            <p className="truncate text-[12px] leading-4 text-slate-500">
              {mode}
            </p>
          </div>
        </div>
        <div className="flex h-10 items-center gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-4 lg:flex-row lg:p-6">
        <aside className="flex min-h-0 w-full shrink-0 flex-col lg:h-full lg:max-h-full lg:w-[280px]">
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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

        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {section !== "availability" &&
          section !== "notify" &&
          section !== "form" ? (
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
              <div className="mb-6 flex items-center gap-3">
                <Avatar name={page.title} cover={page.coverImageUrl} />
                <p className="text-[16px] font-bold text-slate-900">
                  {page.title}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
                <Field label="Event Type Name">{page.title}</Field>
                <Field label="Duration">
                  {formatDuration(page.durationMinutes || 30)}
                </Field>
                <Field label="Price">
                  {formatBookingPrice(page.price, page.currency ?? "AUD")}
                </Field>
                <Field label="Payment Type">{paid ? "Paid" : "Free"}</Field>
                <Field label="Payment Mode">{paymentMode(page)}</Field>
                <Field label="Meeting Mode">
                  {meetingModeLabel(page.meetingMode) || "—"}
                </Field>
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
                    <span
                      className="font-normal [&_a]:text-[#5A32A3] [&_p]:m-0"
                      dangerouslySetInnerHTML={{ __html: page.description }}
                    />
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Integration">
                  {page.calendlyEventTypeId ? "Calendly" : "Not integrated"}
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
                      <p className="truncate text-[13px] text-slate-500">
                        {owner?.email || "—"}
                      </p>
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
              onChange={persistAvailability}
              onBack={() => setSection("consultants")}
              onNext={(values) => persistAvailability(values)}
            />
          ) : null}

          {section === "rules" ? (
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 px-5 py-5 sm:grid-cols-2">
              <Field label="Duration">
                {formatDuration(page.durationMinutes || 30)}
              </Field>
              <Field label="Buffer">
                {page.bufferMinutes ? `${page.bufferMinutes} mins` : "None"}
              </Field>
              <Field label="Minimum notice">
                {page.minNoticeHours != null
                  ? `${page.minNoticeHours} hours`
                  : "2 hours"}
              </Field>
              <Field label="Date range">
                {page.maxAdvanceDays != null
                  ? `${page.maxAdvanceDays} days`
                  : "60 days"}
              </Field>
              <Field label="Max attendees">{page.maxAttendees ?? 1}</Field>
            </div>
          ) : null}

          {section === "notify" ? (
            <ConsultationNotifyPanel
              panel={notifyPanel}
              page={page}
              onSaved={onSaved}
            />
          ) : null}

          {section === "form" ? (
            <BookingFormStep
              key={page.id}
              embedded
              initial={bookingFormFromQuestions(page.questions)}
              onNext={(values) => {
                onSaved({
                  ...page,
                  questions: values.fields
                    .filter((field) => !field.hidden)
                    .map((field) => ({
                      id: field.id,
                      label: field.label,
                      required: field.required,
                    })),
                  confirmationTemplate: values.freeButton,
                });
              }}
            />
          ) : null}
        </section>
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
