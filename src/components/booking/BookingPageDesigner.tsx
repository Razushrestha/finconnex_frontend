"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Tag,
  Upload,
  User,
} from "lucide-react";
import {
  crmEventTypeIdOf,
  getBookingEventTypePage,
  getBookingWorkspacePage,
  saveBookingEventTypePage,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  BOOKING_PAGE_COLORS,
  BOOKING_PAGE_LAYOUTS,
  normalizeBookingPageBranding,
  readLocalBookingPageBranding,
  writeLocalBookingPageBranding,
  type BookingPageBranding,
  type BookingPageLayout,
  type BookingPageService,
} from "@/lib/booking/page-branding";
import { toast } from "@/lib/notify/toast";
import {
  assignedCalendarMembers,
  calendarDefaultHost,
  listConsultationPages,
  type BookingPage,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils";
import { FINANCE_PRIMARY_BUTTON_SM } from "@/components/finance/buttonStyles";

const PANELS = [
  { id: "theme", title: "Theme" },
  { id: "header", title: "Header" },
  { id: "footer", title: "Footer" },
  { id: "workspace", title: "Workspace Properties" },
  { id: "services", title: "Reorder Services" },
  { id: "seo", title: "SEO Properties" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

const LAYOUT_LABEL: Record<BookingPageLayout, string> = {
  basic: "Basic",
  modern: "Modern",
  classic: "Classic",
  fresh: "Fresh",
  compact: "Compact",
};

export function BookingPageDesigner({ page }: { page: BookingPage }) {
  // The theme belongs to this consultation alone: it is loaded from and saved
  // to this consultation's own record, never the workspace's shared one.
  const eventTypeId = crmEventTypeIdOf(page);
  const [branding, setBranding] = useState<BookingPageBranding>(() =>
    readLocalBookingPageBranding(page.id),
  );
  const [services, setServices] = useState<BookingPageService[]>(() =>
    localServices(page),
  );
  const [open, setOpen] = useState<PanelId | null>("theme");
  const [saving, setSaving] = useState<PanelId | null>(null);

  useEffect(() => {
    let alive = true;
    // The workspace's service list is shared; only the theme is per consultation.
    void tryCrmBooking(() => getBookingWorkspacePage()).then((res) => {
      if (alive && res?.services?.length) setServices(res.services);
    });
    if (eventTypeId) {
      void tryCrmBooking(() => getBookingEventTypePage(eventTypeId)).then((res) => {
        if (!alive || !res) return;
        const loaded = normalizeBookingPageBranding(res.branding);
        setBranding(loaded);
        writeLocalBookingPageBranding(page.id, loaded);
      });
    }
    return () => {
      alive = false;
    };
  }, [eventTypeId, page.id]);

  async function save(partial: Partial<BookingPageBranding>, panel: PanelId) {
    const next = { ...branding, ...partial };
    setBranding(next);
    writeLocalBookingPageBranding(page.id, next);
    setSaving(panel);
    try {
      const saved = eventTypeId
        ? await tryCrmBooking(() => saveBookingEventTypePage(eventTypeId, next))
        : null;
      if (saved?.branding) {
        const normalized = normalizeBookingPageBranding(saved.branding);
        setBranding(normalized);
        writeLocalBookingPageBranding(page.id, normalized);
      }
      toast("Booking page saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the booking page");
    } finally {
      setSaving(null);
    }
  }

  const ordered = useMemo(
    () => orderServices(services, branding.serviceOrder, page),
    [services, branding.serviceOrder, page],
  );

  return (
    // Sized by its own width, not the window's: this sits beside the editor's
    // menu, so a wide screen can still leave the preview narrow. Container
    // queries apply to descendants, hence the inner row.
    <div className="@container/designer flex min-h-0 flex-1 flex-col bg-[#F3F4F6]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto @3xl/designer:flex-row @3xl/designer:overflow-hidden">
        <div className="@container min-w-0 p-3 @md/designer:p-5 @3xl/designer:flex-1 @3xl/designer:overflow-auto">
          <BookingPagePreview page={page} branding={branding} />
        </div>
        <aside className="w-full shrink-0 border-t border-slate-200 bg-white @3xl/designer:w-[280px] @3xl/designer:overflow-y-auto @3xl/designer:border-t-0 @3xl/designer:border-l">
          {PANELS.map((panel) => {
            const expanded = open === panel.id;
            return (
              <div key={panel.id} className="border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : panel.id)}
                  className="flex h-11 w-full items-center justify-between px-4 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50"
                >
                  {panel.title}
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {expanded ? (
                  <div className="px-4 pb-4">
                    {panel.id === "theme" ? (
                      <ThemePanel
                        branding={branding}
                        saving={saving === "theme"}
                        onChange={setBranding}
                        onSave={() =>
                          save(
                            {
                              layout: branding.layout,
                              primaryColor: branding.primaryColor,
                              showBanner: branding.showBanner,
                              showUserAsCards: branding.showUserAsCards,
                              buttonText: branding.buttonText,
                              backgroundImageUrl: branding.backgroundImageUrl,
                            },
                            "theme",
                          )
                        }
                      />
                    ) : null}
                    {panel.id === "header" ? (
                      <HeaderPanel
                        branding={branding}
                        saving={saving === "header"}
                        onChange={setBranding}
                        onSave={() => save({ header: branding.header }, "header")}
                      />
                    ) : null}
                    {panel.id === "footer" ? (
                      <FooterPanel
                        branding={branding}
                        saving={saving === "footer"}
                        onChange={setBranding}
                        onSave={() => save({ footer: branding.footer }, "footer")}
                      />
                    ) : null}
                    {panel.id === "workspace" ? (
                      <WorkspacePanel
                        branding={branding}
                        saving={saving === "workspace"}
                        onChange={setBranding}
                        onSave={() => save({ workspace: branding.workspace }, "workspace")}
                      />
                    ) : null}
                    {panel.id === "services" ? (
                      <ServicesPanel
                        services={ordered}
                        saving={saving === "services"}
                        onMove={(from, to) => {
                          const next = [...ordered];
                          const [item] = next.splice(from, 1);
                          next.splice(to, 0, item);
                          setServices(next);
                          setBranding((prev) => ({
                            ...prev,
                            serviceOrder: next.map((row) => row.id),
                          }));
                        }}
                        onSave={() =>
                          save(
                            { serviceOrder: ordered.map((row) => row.id) },
                            "services",
                          )
                        }
                      />
                    ) : null}
                    {panel.id === "seo" ? (
                      <SeoPanel
                        branding={branding}
                        saving={saving === "seo"}
                        onChange={setBranding}
                        onSave={() => save({ seo: branding.seo }, "seo")}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function BookingPagePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  if (branding.layout === "basic") {
    return <BasicThemePreview page={page} branding={branding} />;
  }
  if (branding.layout === "modern") {
    return <ModernThemePreview page={page} branding={branding} />;
  }
  if (branding.layout === "classic") {
    return <ClassicThemePreview page={page} branding={branding} />;
  }
  if (branding.layout === "fresh") {
    return <FreshThemePreview page={page} branding={branding} />;
  }
  return <CompactThemePreview page={page} branding={branding} />;
}

function BasicThemePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  // Basic books in steps, like the live page: Event Type, then Date, Time &
  // User, then Your Info. The preview can be clicked through them.
  const [stage, setStage] = useState<"service" | "schedule" | "details">("service");
  const [day, setDay] = useState(5);
  const [slot, setSlot] = useState("09:00 am");
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const timezone = page.timezone || "Asia/Kathmandu";
  const morning = ["09:00 am", "09:15 am", "09:30 am", "09:45 am", "10:00 am", "10:15 am"];
  const afternoon = ["12:00 pm", "12:15 pm", "12:30 pm", "12:45 pm"];
  const week = [
    { date: 5, day: "MON", open: true },
    { date: 6, day: "TUE", open: true },
    { date: 7, day: "WED", open: true },
    { date: 8, day: "THU", open: true },
    { date: 9, day: "FRI", open: true },
    { date: 10, day: "SAT", open: false },
    { date: 11, day: "SUN", open: false },
  ];
  const steps = [
    {
      id: "service" as const,
      label: "Event Type",
      icon: Clock,
      summary:
        stage !== "service" ? `${page.title} · ${formatDurationHours(page.durationMinutes)}` : null,
    },
    {
      id: "schedule" as const,
      label: "Date, Time & User",
      icon: CalendarClock,
      summary:
        stage === "details" ? `${String(day).padStart(2, "0")} Oct 2026 ${slot} · ${host}` : null,
    },
    { id: "details" as const, label: "Your Info", icon: User, summary: null },
  ];
  const reached = { service: true, schedule: stage !== "service", details: stage === "details" };

  return (
    <div
      className="min-h-full bg-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `url(${branding.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div className="px-5 pt-6 @lg:px-8">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-5 pt-8 pb-6 text-center @lg:px-8">
          <h2 className="text-[22px] font-semibold text-slate-900 @lg:text-[28px]">Welcome!</h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="mx-5 mb-10 grid border-t border-slate-100 @lg:mx-8 @2xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1 border-b border-slate-100 py-3 @2xl:border-r @2xl:border-b-0 @2xl:pr-3">
          {steps.map((item) => {
            const Icon = item.icon;
            const active = stage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!reached[item.id]}
                onClick={() => setStage(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left disabled:cursor-default",
                  active ? "bg-slate-50" : reached[item.id] && "hover:bg-slate-50",
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? color : "#94A3B8" }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[13px]",
                    item.summary ? "text-slate-800" : active ? "font-medium" : "text-slate-500",
                  )}
                  style={active && !item.summary ? { color } : undefined}
                >
                  {item.summary ?? item.label}
                </span>
                {active || item.summary ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="min-w-0 py-5 @2xl:pl-6">
          {stage === "service" ? (
            <button
              type="button"
              onClick={() => setStage("schedule")}
              className="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left hover:bg-slate-50"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[16px]"
                style={{ background: colorWash(color, 0.12), color }}
              >
                {page.title.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-slate-800">
                {page.title}
              </span>
              <span className="shrink-0 text-[12px] text-slate-500">
                {formatDurationHours(page.durationMinutes)}
              </span>
            </button>
          ) : null}
          {stage === "schedule" ? (
            <>
              <p className="border-b border-slate-100 pb-3 text-[13px] text-slate-700">
                Your appointment will be booked with {host}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-slate-800">October, 2026</p>
                <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600">
                  {timezone}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 @md:gap-2">
                {week.map((item) => {
                  const selected = item.open && item.date === day;
                  return (
                    <button
                      key={item.date}
                      type="button"
                      disabled={!item.open}
                      onClick={() => setDay(item.date)}
                      className={cn(
                        "flex h-12 flex-col items-center justify-center rounded-md leading-tight shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 @md:h-14",
                        selected ? "text-white" : item.open ? "text-slate-800" : "text-slate-300",
                      )}
                      style={selected ? { background: color } : undefined}
                    >
                      <span className="text-[13px] @md:text-[15px]">{item.date}</span>
                      <span className="text-[8px] @md:text-[10px]">{item.day}</span>
                    </button>
                  );
                })}
              </div>
              {[
                { label: "Morning", times: morning },
                { label: "Afternoon", times: afternoon },
              ].map((period) => (
                <div key={period.label} className="mt-5">
                  <p className="mb-3 flex items-center gap-3 text-[12px] text-slate-400">
                    <span className="h-px flex-1 bg-slate-100" />
                    {period.label}
                    <span className="h-px flex-1 bg-slate-100" />
                  </p>
                  <div className="grid grid-cols-2 gap-2 @md:grid-cols-3 @3xl:grid-cols-4">
                    {period.times.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSlot(item);
                          setStage("details");
                        }}
                        className="h-9 rounded-md border bg-white text-[12px]"
                        style={{ borderColor: color, color }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : null}
          {stage === "details" ? (
            <>
              <p className="text-center text-[14px] font-semibold text-slate-900">
                Please enter your details
              </p>
              <div className="mx-auto mt-5 max-w-[320px] space-y-3">
                {["Name", "Email", "Contact Number"].map((label) => (
                  <div key={label}>
                    <p className="mb-1 text-[12px] text-slate-600">
                      {label} <span className="text-rose-500">*</span>
                    </p>
                    <div className="h-9 rounded-md border border-slate-200 px-3 text-[12px] leading-9 text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="h-10 w-full rounded-md text-[13px] font-semibold text-white"
                  style={{ background: color }}
                >
                  {branding.buttonText.trim() || "Schedule Appointment"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <PreviewFooter branding={branding} />
    </div>
  );
}

function ModernThemePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  // Like the live page, the button opens a Booking Summary sidebar that
  // takes the guest's details.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const timezone = page.timezone || "Asia/Kathmandu";
  const time = formatClockLabel(firstAvailabilityStart(page));
  const buttonText = branding.buttonText.trim() || "Book Appointment";

  return (
    <div
      className="relative min-h-full overflow-hidden bg-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `url(${branding.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div className="px-5 pt-6 @lg:px-10">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-5 pt-10 pb-8 @lg:px-10">
          <h2 className="text-[22px] font-semibold @lg:text-[28px]" style={{ color }}>
            Welcome!
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="grid gap-5 px-5 pb-16 @lg:grid-cols-2 @lg:px-10 @3xl:grid-cols-3">
        <ModernInfoCard
          icon={Clock}
          color={color}
          title={page.title}
          subtitle={`(${formatDurationHours(page.durationMinutes)})`}
        />
        <ModernInfoCard icon={User} color={color} title={host} />
        <ModernInfoCard icon={Calendar} color={color} title="5 Oct 2026" />
        <ModernInfoCard icon={Globe} color={color} title={timezone} />
        <ModernInfoCard icon={Clock} color={color} title={time} />
        <button
          type="button"
          onClick={() => setSummaryOpen(true)}
          className="flex min-h-[76px] items-center justify-center rounded-xl px-6 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          style={{ background: color }}
        >
          {buttonText}
        </button>
      </div>
      <PreviewFooter branding={branding} />
      {summaryOpen ? (
        <div className="absolute inset-0 flex justify-end">
          <button
            type="button"
            aria-label="Close booking summary"
            onClick={() => setSummaryOpen(false)}
            className="absolute inset-0 bg-slate-900/25"
          />
          <div className="relative flex h-full w-full max-w-[340px] flex-col bg-slate-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-[14px] text-slate-800">Booking Summary</p>
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                className="text-[16px] leading-none text-slate-400"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-3">
              <div className="flex items-center gap-3 bg-white p-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-[16px] text-white"
                  style={{ background: color }}
                >
                  {page.title.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-slate-800">{page.title}</span>
                  <span className="block text-[11px] text-slate-500">
                    ( {formatDurationHours(page.durationMinutes)} )
                  </span>
                </span>
              </div>
              <div className="space-y-1 bg-white p-3 text-[12px] text-slate-700">
                <p>05 Oct 2026 {time}</p>
                <p className="text-slate-500">{timezone}</p>
              </div>
              <div className="space-y-3 bg-white p-3">
                <p className="text-[13px] text-slate-800">Please enter your details</p>
                {["Name", "Email", "Contact Number"].map((label) => (
                  <div key={label}>
                    <p className="mb-1 text-[11px] text-slate-600">
                      {label} <span className="text-rose-500">*</span>
                    </p>
                    <div className="h-8 rounded-md border border-slate-200 px-2 text-[11px] leading-8 text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
                <div
                  className="flex h-9 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                  style={{ background: color }}
                >
                  Schedule Appointment
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModernInfoCard({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: typeof Clock;
  color: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      className="flex min-h-[76px] items-center gap-3 rounded-xl bg-white px-5 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-slate-800">
          {title}
        </span>
        {subtitle ? (
          <span className="block text-[12px] text-slate-400">{subtitle}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

function ClassicThemePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  // Stacked cards, like the live page: Event Type, Date, Time & User, and
  // Your Info once a time is picked.
  const [slot, setSlot] = useState<string | null>(null);
  const [day, setDay] = useState(5);
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const slots = ["09:00 am", "09:15 am", "09:30 am", "09:45 am", "10:00 am", "10:15 am", "10:30 am", "10:45 am"];
  const weekdays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const leadingBlanks = 3;
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: 31 }, (_, i) => i + 1),
  ];
  // Monday-first grid: columns 5 and 6 are Saturday and Sunday.
  const isWeekend = (date: number) => (date + leadingBlanks - 1) % 7 >= 5;
  const card = "rounded-xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-100";

  return (
    <div
      className="min-h-full bg-slate-50/60"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `url(${branding.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div className="px-5 pt-6 @lg:px-10">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-5 pt-8 pb-2 text-center @lg:px-10">
          <h2 className="text-[22px] font-semibold text-slate-900 @lg:text-[28px]">Welcome!</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="space-y-4 px-5 pt-4 pb-16 @lg:px-10">
        <div className={cn(card, "flex items-center gap-3 px-4 py-3")}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: color }}
          >
            <Clock className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-800">
            {page.title}
            <span className="text-slate-400"> | </span>
            <span className="text-[12px] text-slate-500">
              {formatDurationHours(page.durationMinutes)}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color }} />
        </div>
        <div className={cn(card, "px-4 py-4 @lg:px-6")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <p className="flex items-center gap-3 text-[14px] text-slate-800">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: color, color }}
              >
                <CalendarClock className="h-4 w-4" />
              </span>
              Date, Time & User
            </p>
            <p className="text-[12px] text-slate-500">Your appointment will be booked with {host}</p>
          </div>
          <div className="mt-4 grid gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="mb-3 text-center text-[13px] text-slate-700">
                <span style={{ color }}>‹</span>&nbsp;&nbsp; October 2026 &nbsp;&nbsp;<span style={{ color }}>›</span>
              </p>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {weekdays.map((d) => (
                  <span key={d} className="text-[10px] font-medium text-slate-400">
                    {d}
                  </span>
                ))}
                {cells.map((date, i) => {
                  const open = !!date && date >= 5 && !isWeekend(date);
                  const selected = date === day;
                  return (
                    <button
                      key={date ?? `blank-${i}`}
                      type="button"
                      disabled={!open}
                      onClick={() => date && setDay(date)}
                      className={cn(
                        "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px]",
                        selected ? "font-semibold text-white" : open ? "font-semibold text-slate-800" : "text-slate-400",
                      )}
                      style={selected ? { background: color } : undefined}
                    >
                      {date ?? ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Slot Availability</p>
              <div className="mt-2 rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-600">
                {page.timezone || "Asia/Kathmandu"}
              </div>
              <p className="my-3 flex items-center gap-3 text-[11px] text-slate-400">
                <span className="h-px flex-1 bg-slate-100" />
                Morning
                <span className="h-px flex-1 bg-slate-100" />
              </p>
              <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
                {slots.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSlot(item)}
                    className="h-8 rounded-md border text-[11px]"
                    style={
                      slot === item
                        ? { background: color, borderColor: color, color: "#fff" }
                        : { borderColor: color, color }
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {slot ? (
          <div className={cn(card, "px-4 py-4 @lg:px-6")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <p className="flex items-center gap-3 text-[14px] text-slate-800">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border"
                  style={{ borderColor: color, color }}
                >
                  <User className="h-4 w-4" />
                </span>
                Your Info
              </p>
              <p className="text-[12px] text-slate-500">
                {String(day).padStart(2, "0")} Oct 2026 {slot}
              </p>
            </div>
            <div className="mx-auto mt-4 max-w-[320px] space-y-3">
              {["Name", "Email", "Contact Number"].map((label) => (
                <div key={label}>
                  <p className="mb-1 text-[11px] text-slate-600">
                    {label} <span className="text-rose-500">*</span>
                  </p>
                  <div className="h-8 rounded-md border border-slate-200 px-2 text-[11px] leading-8 text-slate-400">
                    {label}
                  </div>
                </div>
              ))}
              <div
                className="flex h-9 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                style={{ background: color }}
              >
                Schedule Appointment
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <PreviewFooter branding={branding} />
    </div>
  );
}

function FreshThemePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  // Fresh books in steps, like the live page: day, then time, then details.
  // The preview can be clicked through them with sample days and times.
  const [stage, setStage] = useState<"day" | "time" | "details">("day");
  const [day, setDay] = useState(5);
  const [slot, setSlot] = useState("09:00 am");
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const people = assignedCalendarMembers(page);
  const timezone = page.timezone || "Asia/Kathmandu";
  const week = [
    { date: 5, day: "MON", open: true },
    { date: 6, day: "TUE", open: true },
    { date: 7, day: "WED", open: true },
    { date: 8, day: "THU", open: true },
    { date: 9, day: "FRI", open: true },
    { date: 10, day: "SAT", open: false },
    { date: 11, day: "SUN", open: false },
  ];
  const weekday = week.find((item) => item.date === day)?.day ?? "MON";
  const weekdayName: Record<string, string> = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
  };
  const slots = ["09:00 am", "09:15 am", "09:30 am", "09:45 am", "10:00 am", "10:15 am"];

  return (
    <div
      className="min-h-full bg-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `url(${branding.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div className="px-5 pt-6 @lg:px-10">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      <div className="px-5 pt-8 pb-16 @lg:px-10">
        {stage === "day" ? (
          <>
            <p className="flex items-center gap-2 text-[15px] text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              {host}
            </p>
            <div className="mt-5 flex flex-col gap-2 border-b border-slate-200 pb-6 @md:flex-row @md:items-center @md:justify-center @md:gap-4">
              <p className="text-[13px] text-slate-500">Choose Timezone</p>
              <div className="rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-700 @md:min-w-[220px]">
                {timezone}
              </div>
            </div>
            {branding.showUserAsCards ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {people.map((name, index) => (
                  <div
                    key={name}
                    className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 @md:min-w-[160px]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: index === 0 ? color : "#94A3B8" }}
                    >
                      {name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-[13px] font-medium text-slate-800">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-10 mb-6 text-center text-[15px] font-medium text-slate-800">
              Select a Day
            </p>
            <div className="flex items-center justify-center gap-1 @md:gap-3">
              <ChevronRight className="h-5 w-5 shrink-0 rotate-180" style={{ color }} />
              <div className="grid min-w-0 max-w-[520px] flex-1 grid-cols-7 gap-1.5 @md:gap-3">
                {week.map((item) => {
                  const selected = item.open && item.date === day;
                  return (
                    <button
                      key={item.date}
                      type="button"
                      disabled={!item.open}
                      onClick={() => {
                        setDay(item.date);
                        setStage("time");
                      }}
                      className={cn(
                        "mx-auto flex aspect-square w-full max-w-[64px] flex-col items-center justify-center rounded-full border-2 leading-tight",
                        !item.open && "border-slate-200 text-slate-300",
                      )}
                      style={
                        selected
                          ? { background: color, borderColor: color, color: "#fff" }
                          : item.open
                            ? { borderColor: color, color: "#334155" }
                            : undefined
                      }
                    >
                      <span className="hidden text-[10px] @md:block">Oct</span>
                      <span className="text-[13px] font-semibold @md:text-[16px]">
                        {item.date}
                      </span>
                      <span className="text-[8px] @md:text-[10px]">{item.day}</span>
                    </button>
                  );
                })}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color }} />
            </div>
          </>
        ) : null}
        {stage === "time" ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setStage("day")}
                className="flex items-start gap-2 text-left"
              >
                <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 rotate-180 text-slate-500" />
                <span>
                  <span className="block text-[15px] text-slate-700">
                    {weekdayName[weekday]}
                  </span>
                  <span className="block text-[12px] text-slate-500">
                    October {day}, 2026
                  </span>
                </span>
              </button>
              <p className="text-[12px] text-slate-500">Times are in {timezone}</p>
            </div>
            <div className="mx-auto mt-6 max-w-[420px]">
              <p className="text-[15px] text-slate-700">Select a Time</p>
              <div className="mt-4 flex items-center gap-3 text-[12px] text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                Morning
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-3 space-y-2">
                {slots.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSlot(item);
                      setStage("details");
                    }}
                    className="h-10 w-full rounded-md border bg-white text-[13px]"
                    style={{ borderColor: color, color }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
        {stage === "details" ? (
          <>
            <button
              type="button"
              onClick={() => setStage("time")}
              className="flex items-center gap-2 text-[15px] text-slate-700"
            >
              <ChevronRight className="h-5 w-5 rotate-180 text-slate-500" />
              Enter Details
            </button>
            <div className="mt-6 grid gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)] @2xl:gap-10">
              <div className="space-y-4 text-[13px] text-slate-700">
                <p className="flex items-center gap-2 font-semibold">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  {page.title}
                </p>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-slate-400" />
                  {host}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  {String(day).padStart(2, "0")} Oct 2026 {slot}
                </p>
                <p className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                  {timezone}
                </p>
              </div>
              <div className="space-y-3">
                {["Name", "Email", "Contact Number"].map((label) => (
                  <div key={label}>
                    <p className="mb-1 text-[12px] text-slate-600">
                      {label} <span className="text-rose-500">*</span>
                    </p>
                    <div className="h-9 rounded-md border border-slate-200 px-3 text-[12px] leading-9 text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="h-10 w-full rounded-md text-[13px] font-semibold text-white"
                  style={{ background: color }}
                >
                  {branding.buttonText.trim() || "Schedule Appointment"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <PreviewFooter branding={branding} />
    </div>
  );
}

function CompactThemePreview({
  page,
  branding,
}: {
  page: BookingPage;
  branding: BookingPageBranding;
}) {
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const slots = [
    "09:00 am",
    "08:30 am",
    "10:00 am",
    "10:30 am",
    "11:30 am",
    "12:00 pm",
  ];
  const price =
    page.price != null
      ? `${page.currency === "NPR" ? "Rs" : page.currency || "A$"} ${page.price}`
      : null;
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const leadingBlanks = 4;
  const monthDays = 31;
  const selectedDay = 3;
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: monthDays }, (_, i) => i + 1),
  ];

  return (
    <div
      className="min-h-full bg-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `url(${branding.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div className="px-5 pt-6 @lg:px-10">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      <div className="grid gap-8 px-5 pt-8 pb-16 @lg:px-10 @xl:grid-cols-[minmax(0,1fr)_minmax(150px,200px)] @4xl:grid-cols-[200px_minmax(0,1fr)_200px]">
        <div className="@xl:col-span-2 @4xl:col-span-1">
          <button type="button" className="text-[12px] text-slate-400">
            ← Back
          </button>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#A5A3E8] text-[11px] font-bold text-white">
              {page.title.slice(0, 2).toUpperCase()}
            </span>
            <p className="text-[15px] font-semibold text-slate-900">{page.title}</p>
          </div>
          <div className="mt-5 space-y-3 text-[13px] text-slate-500">
            <p className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              {host}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {formatDurationHours(page.durationMinutes)}
            </p>
            {price ? (
              <p className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                {price}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <p className="mb-4 text-[15px] font-semibold text-slate-800">
            Select date and time
          </p>
          <div className="mb-4 flex items-center justify-center gap-6 text-[13px] font-medium text-slate-700">
            <span className="text-slate-300">‹</span>
            October, 2026
            <span className="text-slate-300">›</span>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {weekdays.map((day, i) => (
              <span
                key={`${day}-${i}`}
                className="text-[11px] font-medium text-slate-400"
              >
                {day}
              </span>
            ))}
            {cells.map((day, i) => (
              <span
                key={day ?? `blank-${i}`}
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[13px]",
                  day === selectedDay ? "font-semibold text-white" : "text-slate-700",
                )}
                style={day === selectedDay ? { background: color } : undefined}
              >
                {day ?? ""}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <p className="mb-1 text-[12px] text-slate-400">Time Zone</p>
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-600">
              {page.timezone || "Asia/Kathmandu"}
            </div>
          </div>
        </div>
        <div>
          <p className="mb-4 text-center text-[14px] font-medium text-slate-700">
            Sunday, October 4
          </p>
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-1">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className="h-10 w-full rounded-full border bg-white text-[13px]"
                style={{ borderColor: color, color }}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>
      <PreviewFooter branding={branding} />
    </div>
  );
}

function formatDurationHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins} mins`;
  if (hours) return `${hours}h`;
  return `${mins} mins`;
}

function firstAvailabilityStart(page: BookingPage) {
  const rule = page.availability?.find((row) => row.enabled && row.start);
  return rule?.start || "09:00";
}

function formatClockLabel(hhmm: string) {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw) || 0;
  if (!Number.isFinite(hour)) return "09:00 am";
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 || 12;
  return `${String(display).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function PreviewHeader({
  branding,
  title,
  compact = false,
}: {
  branding: BookingPageBranding;
  title: string;
  compact?: boolean;
}) {
  if (!branding.header.titleVisible && !(branding.header.logoVisible && branding.header.logoUrl)) {
    return null;
  }
  return (
    <div className={cn("flex items-center gap-3", !compact && "border-b border-slate-100 px-6 py-4")}>
      {branding.header.logoVisible && branding.header.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.header.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
      ) : null}
      {branding.header.titleVisible ? (
        <p className="text-[16px] font-semibold text-slate-900">{title}</p>
      ) : null}
    </div>
  );
}

function colorWash(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(90, 50, 163, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function PreviewFooter({ branding }: { branding: BookingPageBranding }) {
  const items = [
    branding.footer.contactVisible && branding.footer.contact,
    branding.footer.emailVisible && branding.footer.email,
    branding.footer.addressVisible && branding.footer.address,
    branding.footer.facebookVisible && branding.footer.facebook,
    branding.footer.instagramVisible && branding.footer.instagram,
    branding.footer.xVisible && branding.footer.x,
    branding.footer.linkedinVisible && branding.footer.linkedin,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-6 py-3 text-[11px] text-slate-500">
      {items.map((item) => (
        <span key={String(item)}>{item}</span>
      ))}
    </div>
  );
}

function ThemePanel({
  branding,
  saving,
  onChange,
  onSave,
}: {
  branding: BookingPageBranding;
  saving: boolean;
  onChange: (next: BookingPageBranding) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold text-slate-700">Layouts</p>
      <div className="grid grid-cols-2 gap-2">
        {BOOKING_PAGE_LAYOUTS.map((layout) => (
          <button
            key={layout}
            type="button"
            onClick={() => onChange({ ...branding, layout })}
            className={cn(
              "relative rounded-lg border bg-white p-2 text-left",
              branding.layout === layout ? "border-[#5A32A3]" : "border-slate-200",
            )}
          >
            {branding.layout === layout ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#5A32A3] text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            ) : null}
            <LayoutThumb layout={layout} />
            <p className="mt-1 text-[11px] font-medium text-slate-700">
              {LAYOUT_LABEL[layout]}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-4 mb-2 text-[12px] font-semibold text-slate-700">
        Color Options
      </p>
      <div className="grid grid-cols-6 gap-2">
        {BOOKING_PAGE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange({ ...branding, primaryColor: color })}
            className={cn(
              "h-6 w-6 rounded-full ring-offset-2",
              branding.primaryColor === color && "ring-2 ring-slate-400",
            )}
            style={{ background: color }}
            aria-label={color}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-slate-700">Show Banner</p>
        <button
          type="button"
          onClick={() => onChange({ ...branding, showBanner: !branding.showBanner })}
          className={cn(
            "relative h-5 w-9 rounded-full transition",
            branding.showBanner ? "bg-[#5A32A3]" : "bg-slate-300",
          )}
          aria-pressed={branding.showBanner}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
              branding.showBanner ? "left-4" : "left-0.5",
            )}
          />
        </button>
      </div>
      <p className="mt-4 mb-2 text-[12px] font-semibold text-slate-700">
        Background Image
      </p>
      <ImageField
        value={branding.backgroundImageUrl}
        placeholder="Upload"
        onChange={(url) => onChange({ ...branding, backgroundImageUrl: url })}
      />
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-slate-700">
          Show User as Cards
        </p>
        <button
          type="button"
          onClick={() =>
            onChange({ ...branding, showUserAsCards: !branding.showUserAsCards })
          }
          className={cn(
            "relative h-5 w-9 rounded-full transition",
            branding.showUserAsCards ? "bg-[#5A32A3]" : "bg-slate-300",
          )}
          aria-pressed={branding.showUserAsCards}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
              branding.showUserAsCards ? "left-4" : "left-0.5",
            )}
          />
        </button>
      </div>
      <p className="mt-4 mb-2 text-[12px] font-semibold text-slate-700">
        Button text
      </p>
      <input
        value={branding.buttonText}
        onChange={(event) =>
          onChange({ ...branding, buttonText: event.target.value })
        }
        placeholder="Book Appointment"
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
      />
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function HeaderPanel({
  branding,
  saving,
  onChange,
  onSave,
}: {
  branding: BookingPageBranding;
  saving: boolean;
  onChange: (next: BookingPageBranding) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <LabeledInput
        label="Title"
        visible={branding.header.titleVisible}
        value={branding.header.title}
        placeholder="Enter your title"
        onVisible={(titleVisible) =>
          onChange({ ...branding, header: { ...branding.header, titleVisible } })
        }
        onChange={(title) =>
          onChange({ ...branding, header: { ...branding.header, title } })
        }
      />
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[12px] font-medium text-slate-700">Logo</p>
          <EyeToggle
            on={branding.header.logoVisible}
            onChange={(logoVisible) =>
              onChange({ ...branding, header: { ...branding.header, logoVisible } })
            }
          />
        </div>
        <ImageField
          value={branding.header.logoUrl}
          placeholder="Upload logo"
          onChange={(logoUrl) =>
            onChange({ ...branding, header: { ...branding.header, logoUrl } })
          }
        />
      </div>
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function FooterPanel({
  branding,
  saving,
  onChange,
  onSave,
}: {
  branding: BookingPageBranding;
  saving: boolean;
  onChange: (next: BookingPageBranding) => void;
  onSave: () => void;
}) {
  const set = (patch: Partial<BookingPageBranding["footer"]>) =>
    onChange({ ...branding, footer: { ...branding.footer, ...patch } });
  return (
    <div className="space-y-3">
      <LabeledInput
        label="Contact Number"
        visible={branding.footer.contactVisible}
        value={branding.footer.contact}
        placeholder="+977"
        onVisible={(contactVisible) => set({ contactVisible })}
        onChange={(contact) => set({ contact })}
      />
      <LabeledInput
        label="Email"
        visible={branding.footer.emailVisible}
        value={branding.footer.email}
        placeholder="Email"
        onVisible={(emailVisible) => set({ emailVisible })}
        onChange={(email) => set({ email })}
      />
      <LabeledInput
        label="Address"
        visible={branding.footer.addressVisible}
        value={branding.footer.address}
        placeholder="Address"
        onVisible={(addressVisible) => set({ addressVisible })}
        onChange={(address) => set({ address })}
      />
      <LabeledInput
        label="Facebook"
        visible={branding.footer.facebookVisible}
        value={branding.footer.facebook}
        placeholder="facebook"
        onVisible={(facebookVisible) => set({ facebookVisible })}
        onChange={(facebook) => set({ facebook })}
      />
      <LabeledInput
        label="Instagram"
        visible={branding.footer.instagramVisible}
        value={branding.footer.instagram}
        placeholder="Instagram"
        onVisible={(instagramVisible) => set({ instagramVisible })}
        onChange={(instagram) => set({ instagram })}
      />
      <LabeledInput
        label="X"
        visible={branding.footer.xVisible}
        value={branding.footer.x}
        placeholder="x"
        onVisible={(xVisible) => set({ xVisible })}
        onChange={(x) => set({ x })}
      />
      <LabeledInput
        label="LinkedIn"
        visible={branding.footer.linkedinVisible}
        value={branding.footer.linkedin}
        placeholder="LinkedIn"
        onVisible={(linkedinVisible) => set({ linkedinVisible })}
        onChange={(linkedin) => set({ linkedin })}
      />
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function WorkspacePanel({
  branding,
  saving,
  onChange,
  onSave,
}: {
  branding: BookingPageBranding;
  saving: boolean;
  onChange: (next: BookingPageBranding) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-slate-700">
        Display name
      </label>
      <input
        value={branding.workspace.displayName}
        onChange={(event) =>
          onChange({
            ...branding,
            workspace: { displayName: event.target.value },
          })
        }
        placeholder="Workspace name"
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
      />
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function ServicesPanel({
  services,
  saving,
  onMove,
  onSave,
}: {
  services: BookingPageService[];
  saving: boolean;
  onMove: (from: number, to: number) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {services.map((service, index) => (
          <div key={service.id} className="flex items-center gap-2 px-2 py-2">
            <button
              type="button"
              className="text-slate-300"
              onClick={() => onMove(index, Math.max(0, index - 1))}
              aria-label="Move up"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 truncate text-[13px] text-slate-800">
              {service.name}
            </p>
          </div>
        ))}
      </div>
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function SeoPanel({
  branding,
  saving,
  onChange,
  onSave,
}: {
  branding: BookingPageBranding;
  saving: boolean;
  onChange: (next: BookingPageBranding) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-slate-700">
          SEO title
        </span>
        <input
          value={branding.seo.title}
          onChange={(event) =>
            onChange({ ...branding, seo: { ...branding.seo, title: event.target.value } })
          }
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-slate-700">
          SEO description
        </span>
        <textarea
          value={branding.seo.description}
          onChange={(event) =>
            onChange({
              ...branding,
              seo: { ...branding.seo, description: event.target.value },
            })
          }
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#5A32A3]"
        />
      </label>
      <SaveButton saving={saving} onClick={onSave} />
    </div>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  visible,
  onChange,
  onVisible,
}: {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChange: (value: string) => void;
  onVisible: (visible: boolean) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[12px] font-medium text-slate-700">
        {label}
        <EyeToggle on={visible} onChange={onVisible} />
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
      />
    </label>
  );
}

function EyeToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="text-slate-400 hover:text-slate-700"
      aria-label={on ? "Hide" : "Show"}
    >
      {on ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
    </button>
  );
}

function ImageField({
  value,
  placeholder,
  onChange,
}: {
  value: string | null;
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") onChange(reader.result);
          };
          reader.readAsDataURL(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-[13px] text-slate-500"
      >
        <span className="truncate">{value ? "Image selected" : placeholder}</span>
        <Upload className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={cn(
        FINANCE_PRIMARY_BUTTON_SM,
        "mt-4 h-10 w-full rounded-lg text-[13px] disabled:opacity-50",
      )}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function LayoutThumb({ layout }: { layout: BookingPageLayout }) {
  if (layout === "modern") {
    return <div className="grid h-10 grid-cols-3 gap-1">{bars(3)}</div>;
  }
  if (layout === "classic") {
    return <div className="space-y-1">{bars(3)}</div>;
  }
  if (layout === "fresh") {
    return <div className="flex h-10 gap-1">{bars(2)}</div>;
  }
  if (layout === "compact") {
    return <div className="grid h-10 grid-cols-3 gap-0.5">{bars(6)}</div>;
  }
  return <div className="space-y-1">{bars(2)}</div>;
}

function bars(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="block h-2 rounded-sm bg-slate-200" />
  ));
}

function localServices(page: BookingPage): BookingPageService[] {
  const pages = listConsultationPages();
  const rows = pages.length ? pages : [page];
  return rows.map((row) => ({
    id: row.crmEventTypeId || row.id,
    name: row.title,
    slug: row.slug,
    durationMinutes: row.durationMinutes,
    isPublic: row.status === "Live",
    isActive: row.status === "Live",
  }));
}

function orderServices(
  services: BookingPageService[],
  order: string[],
  page: BookingPage,
) {
  const list = services.length ? services : localServices(page);
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...list].sort((a, b) => {
    const left = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const right = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return left - right || a.name.localeCompare(b.name);
  });
}
