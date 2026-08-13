"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Share2,
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
import { cn } from "@/lib/utils";
import { initials } from "@/lib/activities/shared";
import {
  consultationModeLabel,
  listConsultationPages,
  nextBookingPageId,
  publicBookUrl,
  upsertBookingPage,
  WEEKDAYS,
  type BookingPage,
} from "@/lib/booking/types";

const BRAND = "#5A32A3";

type ViewMode = "grid" | "list";

export function ConsultationsBoard() {
  const router = useRouter();
  const [pages, setPages] = useState<BookingPage[]>(() =>
    typeof window === "undefined" ? [] : listConsultationPages(),
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [open, setOpen] = useState(true);
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
      meetingVia: detailsValues.online ? "video" : "in_person",
      meetingViaDetail: detailsValues.online
        ? detailsValues.platform
        : undefined,
      consultants: assignedConsultants,
      price: detailsValues.price,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => {
      const people = (p.consultants ?? [p.owner]).join(" ").toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        people.includes(q) ||
        consultationModeLabel(p.consultationMode).toLowerCase().includes(q)
      );
    });
  }, [pages, query]);

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
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
            Consultations
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Manage and track all consultations in one place
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChooseType(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold text-white shadow-sm hover:brightness-110 sm:px-4"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="h-4 w-4" />
            New Consultation
          </button>
          <IconBtn label="Calendar">
            <CalendarDays className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Filter">
            <Filter className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="More">
            <MoreVertical className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 self-start text-[15px] font-semibold text-slate-800"
        >
          Active Consultations
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600">
            {filtered.length}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform",
              !open && "-rotate-90",
            )}
          />
        </button>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Consultations"
              className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-9 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/40"
            />
          </label>
          <div className="inline-flex self-end overflow-hidden rounded-lg border border-[#E5E7EB] bg-white sm:self-auto">
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
        </div>
      </div>

      {open ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((page) => (
              <ConsultationCard
                key={page.id}
                page={page}
                onOpen={() => router.push(`/booking/${page.id}`)}
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
              />
            ))}
          </div>
        )
      ) : null}

      {open && filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[13px] text-slate-400">
          No consultations match your search.
        </p>
      ) : null}

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

function IconBtn({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-slate-500 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function ConsultationCard({
  page,
  onOpen,
}: {
  page: BookingPage;
  onOpen: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-start gap-3 text-left"
      >
        <BrandMark page={page} />
        <div className="min-w-0 pt-0.5">
          <h3 className="truncate text-[16px] font-bold text-slate-900">
            {page.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {page.durationMinutes} mins | {mode}
          </p>
        </div>
      </button>
      <div className="mt-8 flex items-center justify-between gap-3">
        <PeopleSlot people={people} />
        <ShareButton slug={page.slug} />
      </div>
    </article>
  );
}

function ConsultationRow({
  page,
  onOpen,
}: {
  page: BookingPage;
  onOpen: () => void;
}) {
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";

  return (
    <div className="flex flex-col gap-3 border-b border-[#F3F4F6] px-4 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <BrandMark page={page} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">
            {page.title}
          </p>
          <p className="text-[12px] text-slate-500">
            {page.durationMinutes} mins | {mode}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <PeopleSlot people={people} />
        <ShareButton slug={page.slug} />
      </div>
    </div>
  );
}

function BrandMark({ page }: { page: BookingPage }) {
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

function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}${publicBookUrl(slug)}`,
          );
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold hover:bg-[#F3ECFB]"
      style={{ borderColor: `${BRAND}55`, color: BRAND }}
    >
      <Share2 className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Share"}
    </button>
  );
}
