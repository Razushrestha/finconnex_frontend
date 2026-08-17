"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderInput,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  User,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { ConsultationMode } from "@/lib/booking/types";
import { AssignConsultantsStep } from "@/components/booking/AssignConsultantsStep";
import { BookingAdditionalSettingsStep } from "@/components/booking/BookingAdditionalSettingsStep";
import {
  BookingFormStep,
  type BookingFormValues,
} from "@/components/booking/BookingFormStep";
import {
  BookingNotificationsStep,
  type NotificationRow,
} from "@/components/booking/BookingNotificationsStep";
import {
  BookingRulesStep,
  rulesToPageFields,
  type BookingRulesValues,
} from "@/components/booking/BookingRulesStep";
import {
  ConsultationDetailsStep,
  type CalendarTypeChoice,
  type ConsultationDetailsValues,
} from "@/components/booking/ConsultationDetailsStep";
import { ShareConsultationModal } from "@/components/booking/ShareConsultationModal";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/activities/shared";
import {
  consultationModeLabel,
  deleteBookingPage,
  listConsultationPages,
  nextBookingPageId,
  publicBookUrl,
  upsertBookingPage,
  WEEKDAYS,
  type BookingPage,
} from "@/lib/booking/types";

const BRAND = "#5A32A3";

type ViewMode = "grid" | "list";

const SECTION_FILTERS = [
  "All Consultations",
  "Active Consultations",
  "My Consultations",
] as const;

type SectionFilter = (typeof SECTION_FILTERS)[number];

function matchesSection(
  page: BookingPage,
  filter: SectionFilter,
  myName: string,
) {
  const mine =
    page.owner === myName || (page.consultants ?? []).includes(myName);
  switch (filter) {
    case "All Consultations":
      return true;
    case "Active Consultations":
      return page.status === "Live";
    case "My Consultations":
      return mine;
    default:
      return true;
  }
}

export function ConsultationsBoard() {
  const router = useRouter();
  const [pages, setPages] = useState<BookingPage[]>(() =>
    typeof window === "undefined" ? [] : listConsultationPages(),
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionFilter, setSectionFilter] =
    useState<SectionFilter>("Active Consultations");
  const sectionRef = useRef<HTMLDivElement>(null);
  const [chooseType, setChooseType] = useState(false);
  const [detailsChoice, setDetailsChoice] = useState<CalendarTypeChoice | null>(
    null,
  );
  const [detailsValues, setDetailsValues] =
    useState<ConsultationDetailsValues | null>(null);
  const [assignStep, setAssignStep] = useState(false);
  const [assignedConsultants, setAssignedConsultants] = useState<string[]>([]);
  const [rulesStep, setRulesStep] = useState(false);
  const [rulesValues, setRulesValues] = useState<BookingRulesValues | null>(
    null,
  );
  const [formStep, setFormStep] = useState(false);
  const [formValues, setFormValues] = useState<BookingFormValues | null>(null);
  const [notifyStep, setNotifyStep] = useState(false);
  const [notifyValues, setNotifyValues] = useState<NotificationRow[] | null>(
    null,
  );
  const [settingsStep, setSettingsStep] = useState(false);

  function resetWizard() {
    setSettingsStep(false);
    setNotifyStep(false);
    setFormStep(false);
    setRulesStep(false);
    setAssignStep(false);
    setAssignedConsultants([]);
    setRulesValues(null);
    setFormValues(null);
    setNotifyValues(null);
    setDetailsValues(null);
    setDetailsChoice(null);
  }

  function finishConsultation(form: BookingFormValues | null) {
    if (!detailsChoice || !detailsValues || !rulesValues) return;
    const mapped = rulesToPageFields(rulesValues);
    const slug = detailsValues.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    upsertBookingPage({
      id: nextBookingPageId(),
      title: detailsValues.name,
      slug: slug || `consult-${Date.now()}`,
      owner: assignedConsultants[0] ?? "Admin",
      eventType: "Consultation",
      consultationMode: detailsChoice.mode,
      meetingMode: "one_time",
      durationMinutes: mapped.durationMinutes,
      bufferMinutes: mapped.bufferMinutes,
      minNoticeHours: mapped.minNoticeHours,
      maxAdvanceDays: mapped.maxAdvanceDays,
      maxAttendees: mapped.maxAttendees,
      timezone: "Australia/Sydney",
      meetingVia:
        detailsValues.meetingPlace === "online"
          ? "video"
          : detailsValues.meetingPlace === "offline"
            ? "in_person"
            : "phone",
      meetingViaDetail:
        detailsValues.meetingPlace === "online"
          ? detailsValues.platform
          : detailsValues.meetingPlace === "offline"
            ? detailsValues.locationDetail || undefined
            : detailsValues.phoneDetail || undefined,
      consultants: assignedConsultants,
      price: detailsValues.price,
      coverImageUrl: detailsValues.coverImageUrl,
      currency: "AUD",
      description: "",
      availability: WEEKDAYS.map((day) => ({
        day,
        enabled: day !== "Saturday" && day !== "Sunday",
        start: "09:00",
        end: "17:00",
      })),
      questions: (form?.fields ?? [])
        .filter((f) => !f.hidden)
        .map((f) => ({
          id: f.id,
          label: f.label,
          required: f.required,
        })),
      confirmationTemplate:
        form?.freeButton ||
        "Hi {{name}}, your consultation is confirmed for {{datetime}}.",
      reminderTemplate: "Consultation reminder: starting soon.",
      status: "Live",
      views: 0,
      bookingsCount: 0,
      cancelRate: 0,
      createdAt: new Date().toLocaleDateString("en-GB"),
    });
    setPages(listConsultationPages());
    resetWizard();
  }

  useEffect(() => {
    if (!sectionOpen) return;
    function onDoc(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setSectionOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sectionOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      if (!matchesSection(p, sectionFilter, getRulesActor().name)) return false;
      if (!q) return true;
      const people = (p.consultants ?? [p.owner]).join(" ").toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        people.includes(q) ||
        consultationModeLabel(p.consultationMode).toLowerCase().includes(q)
      );
    });
  }, [pages, query, sectionFilter]);

  if (detailsChoice && settingsStep && detailsValues) {
    return (
      <BookingAdditionalSettingsStep
        onBack={() => setSettingsStep(false)}
        onFinish={() => finishConsultation(formValues)}
      />
    );
  }

  if (detailsChoice && notifyStep && detailsValues) {
    return (
      <BookingNotificationsStep
        initial={notifyValues ?? undefined}
        onBack={() => setNotifyStep(false)}
        onNext={(rows) => {
          setNotifyValues(rows);
          setSettingsStep(true);
        }}
      />
    );
  }

  if (detailsChoice && formStep && detailsValues) {
    return (
      <BookingFormStep
        initial={formValues ?? undefined}
        onBack={() => setFormStep(false)}
        onNext={(values) => {
          setFormValues(values);
          setNotifyStep(true);
        }}
      />
    );
  }

  if (detailsChoice && rulesStep && detailsValues) {
    return (
      <BookingRulesStep
        durationMinutes={detailsValues.durationMinutes}
        initial={rulesValues}
        onBack={() => setRulesStep(false)}
        onSave={(rules) => {
          setRulesValues(rules);
          setFormStep(true);
        }}
      />
    );
  }

  if (detailsChoice && assignStep && detailsValues) {
    return (
      <AssignConsultantsStep
        choice={detailsChoice}
        consultationName={detailsValues.name}
        onBack={() => setAssignStep(false)}
        onCreate={(consultants) => {
          setAssignedConsultants(consultants);
          setRulesStep(true);
        }}
      />
    );
  }

  if (detailsChoice) {
    return (
      <ConsultationDetailsStep
        choice={detailsChoice}
        initial={detailsValues ?? undefined}
        onBack={() => {
          setDetailsChoice(null);
          setDetailsValues(null);
          setChooseType(true);
        }}
        onNext={(values) => {
          setDetailsValues(values);
          setAssignStep(true);
        }}
      />
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2 sm:mb-6">
        <label className="relative min-w-0 w-full sm:w-72 lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search consultations…"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pr-9 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "flex h-10 w-10 items-center justify-center",
              view === "grid"
                ? "bg-[#F3ECFB] text-[#5A32A3]"
                : "text-slate-400 hover:bg-slate-50",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex h-10 w-10 items-center justify-center border-l border-[#E5E7EB]",
              view === "list"
                ? "bg-[#F3ECFB] text-[#5A32A3]"
                : "text-slate-400 hover:bg-slate-50",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setChooseType(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold text-white shadow-sm hover:brightness-110 sm:px-4"
          style={{ backgroundColor: BRAND }}
        >
          <Plus className="h-4 w-4" />
          New Consultation
        </button>
      </div>

      <div className="mb-4">
        <div className="relative self-start" ref={sectionRef}>
          <button
            type="button"
            onClick={() => setSectionOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-800"
            aria-expanded={sectionOpen}
          >
            {sectionFilter}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F3ECFB] px-1.5 text-[11px] font-bold text-[#5A32A3]">
              {filtered.length}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                sectionOpen && "rotate-180",
              )}
            />
          </button>
          {sectionOpen ? (
            <div className="absolute top-9 left-0 z-30 w-56 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              {SECTION_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSectionFilter(option);
                    setSectionOpen(false);
                  }}
                  className={cn(
                    "flex w-full px-3 py-2.5 text-left text-[13px] font-medium",
                    option === sectionFilter
                      ? "bg-[#F3ECFB] text-[#5A32A3]"
                      : "text-slate-800 hover:bg-slate-50",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
          No consultations in this view.
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((page) => (
            <ConsultationCard
              key={page.id}
              page={page}
              onOpen={() => router.push(`/booking/${page.id}`)}
              onRefresh={() => setPages(listConsultationPages())}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          {filtered.map((page) => (
            <ConsultationRow
              key={page.id}
              page={page}
              onOpen={() => router.push(`/booking/${page.id}`)}
              onRefresh={() => setPages(listConsultationPages())}
            />
          ))}
        </div>
      )}

      {chooseType ? (
        <ChooseCalendarTypeModal
          onClose={() => setChooseType(false)}
          onSelect={(choice) => {
            setChooseType(false);
            setDetailsChoice(choice);
          }}
        />
      ) : null}
    </div>
  );
}

const CALENDAR_TYPES: {
  mode: ConsultationMode;
  title: string;
  description: string;
  example: string;
  icon: typeof Users;
}[] = [
  {
    mode: "one_to_one",
    title: "Personal booking",
    description: "Schedules one-on-one meetings with a specific team member.",
    example: "Client meetings, private consultations.",
    icon: Users,
  },
  {
    mode: "one_to_one",
    title: "Round robin",
    description: "Distributes appointments among team members in a rotating order.",
    example: "Sales calls, onboarding sessions.",
    icon: RefreshCw,
  },
  {
    mode: "group",
    title: "Class booking",
    description: "One host meets with multiple participants.",
    example: "Webinars, group training, online classes.",
    icon: Presentation,
  },
  {
    mode: "collective",
    title: "Collective booking",
    description: "Multiple hosts meet with one participant.",
    example: "Panel interviews, committee reviews.",
    icon: UsersRound,
  },
];

const MORE_CALENDAR_TYPES: typeof CALENDAR_TYPES = [
  {
    mode: "resource",
    title: "Resource booking",
    description: "Reserve a room, desk, or piece of equipment.",
    example: "Conference rooms, equipment rentals.",
    icon: CalendarDays,
  },
];

function ChooseCalendarTypeModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (choice: CalendarTypeChoice) => void;
}) {
  const [more, setMore] = useState(false);
  const types = more ? [...CALENDAR_TYPES, ...MORE_CALENDAR_TYPES] : CALENDAR_TYPES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="choose-calendar-title"
        className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-[#E5E7EB] px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h2
            id="choose-calendar-title"
            className="pr-10 text-[18px] font-bold text-slate-800 sm:text-[20px]"
          >
            Choose calendar type
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            Select a calendar type to set up your calendar and customize how
            appointments are scheduled.
          </p>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:pb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {types.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => onSelect({ mode: t.mode, title: t.title })}
                  className="flex min-h-[118px] cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-left transition-colors hover:border-[#5A32A3]/40 hover:bg-[#F3ECFB] focus-visible:ring-2 focus-visible:ring-[#5A32A3]/25 focus-visible:outline-none"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#5A32A3]" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#5A32A3]">
                      {t.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                      {t.description}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-400">
                      E.g.: {t.example}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#5A32A3] hover:underline"
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", more && "rotate-90")}
            />
            {more ? "Show fewer types" : "Explore more types"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsultationCard({
  page,
  onOpen,
  onRefresh,
}: {
  page: BookingPage;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="relative flex min-w-0 cursor-pointer flex-col rounded-xl border border-[#5A32A3]/25 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#F3ECFB]"
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <BrandMark page={page} />
          <div className="min-w-0 pt-0.5">
            <h3 className="truncate text-[16px] font-bold text-slate-900">
              {page.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {page.durationMinutes} mins | {mode}
            </p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CardMenu page={page} onRefresh={onRefresh} />
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between gap-3">
        <PeopleSlot people={people} />
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton slug={page.slug} title={page.title} />
        </div>
      </div>
    </article>
  );
}

function ConsultationRow({
  page,
  onOpen,
  onRefresh,
}: {
  page: BookingPage;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-col gap-3 border-b border-[#F3F4F6] px-4 py-3.5 transition-colors last:border-0 hover:bg-[#F3ECFB] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3 text-left">
        <BrandMark page={page} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">
            {page.title}
          </p>
          <p className="text-[12px] text-slate-500">
            {page.durationMinutes} mins | {mode}
          </p>
        </div>
      </div>
      <div
        className="flex items-center justify-between gap-3 sm:justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <PeopleSlot people={people} />
        <ShareButton slug={page.slug} title={page.title} />
        <CardMenu page={page} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

function CardMenu({
  page,
  onRefresh,
}: {
  page: BookingPage;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function copyPage() {
    const slugBase = `${page.slug}-copy`.slice(0, 48);
    upsertBookingPage({
      ...page,
      id: nextBookingPageId(),
      title: `${page.title} (copy)`,
      slug: slugBase,
      views: 0,
      bookingsCount: 0,
      createdAt: new Date().toLocaleDateString("en-GB"),
    });
    onRefresh();
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute top-9 right-0 z-30 w-44 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          <MenuRow
            icon={Pencil}
            label="Edit"
            onClick={() => {
              setOpen(false);
              router.push(`/booking/${page.id}`);
            }}
          />
          <MenuRow
            icon={ExternalLink}
            label="Booking page"
            onClick={() => {
              setOpen(false);
              window.open(publicBookUrl(page.slug), "_blank", "noopener");
            }}
          />
          <MenuRow
            icon={Copy}
            label="Make a copy"
            onClick={() => {
              setOpen(false);
              copyPage();
            }}
          />
          <MenuRow
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
              upsertBookingPage({ ...page, status: next });
              setOpen(false);
              onRefresh();
            }}
          />
          <MenuRow
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              if (!window.confirm(`Delete “${page.title}”?`)) return;
              deleteBookingPage(page.id);
              setOpen(false);
              onRefresh();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-800 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function BrandMark({ page }: { page: BookingPage }) {
  if (page.coverImageUrl) {
    return (
      <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <img
          src={page.coverImageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  if (page.id === "bp5" || page.slug === "rate-review") {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
        style={{ backgroundColor: BRAND }}
        aria-hidden
      >
        F
      </span>
    );
  }
  if (page.id === "bp6" || page.slug === "test-natural-home") {
    return (
      <span className="flex h-12 w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-md border border-slate-200 bg-white text-center leading-none">
        <span className="text-[8px] font-extrabold tracking-wide text-slate-800">
          NATURAL
        </span>
        <span className="text-[9px] font-bold text-slate-700">HOME</span>
      </span>
    );
  }
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
      style={{ backgroundColor: BRAND }}
    >
      {initials(page.title || page.owner)}
    </span>
  );
}

function ShareButton({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold hover:bg-[#F3ECFB]"
        style={{ borderColor: `${BRAND}55`, color: BRAND }}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      {open ? (
        <ShareConsultationModal
          title={title}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PeopleSlot({ people }: { people: string[] }) {
  if (people.length > 1) {
    return (
      <div className="flex items-center" aria-label={people.join(", ")}>
        {people.slice(0, 3).map((name, i) => (
          <span
            key={name}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-400",
              i > 0 && "-ml-2",
            )}
          >
            <User className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{people[0]}</span>
    </p>
  );
}

