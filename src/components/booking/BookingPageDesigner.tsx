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
  getBookingWorkspacePage,
  saveBookingWorkspacePage,
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
  const [branding, setBranding] = useState<BookingPageBranding>(() =>
    readLocalBookingPageBranding(),
  );
  const [services, setServices] = useState<BookingPageService[]>(() =>
    localServices(page),
  );
  const [open, setOpen] = useState<PanelId | null>("theme");
  const [saving, setSaving] = useState<PanelId | null>(null);

  useEffect(() => {
    let alive = true;
    void tryCrmBooking(() => getBookingWorkspacePage()).then((res) => {
      if (!alive || !res) return;
      setBranding(normalizeBookingPageBranding(res.branding));
      if (res.services?.length) setServices(res.services);
      writeLocalBookingPageBranding(normalizeBookingPageBranding(res.branding));
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(partial: Partial<BookingPageBranding>, panel: PanelId) {
    const next = { ...branding, ...partial };
    setBranding(next);
    writeLocalBookingPageBranding(next);
    setSaving(panel);
    try {
      const saved = await tryCrmBooking(() => saveBookingWorkspacePage(next));
      if (saved?.branding) {
        const normalized = normalizeBookingPageBranding(saved.branding);
        setBranding(normalized);
        writeLocalBookingPageBranding(normalized);
        if (saved.services?.length) setServices(saved.services);
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
    <div className="flex min-h-0 flex-1 bg-[#F3F4F6]">
      <div className="min-w-0 flex-1 overflow-auto p-5">
        <BookingPagePreview page={page} branding={branding} />
      </div>
      <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
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
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const slots = [
    "08:00 am",
    "09:30 am",
    "10:00 am",
    "10:30 am",
    "11:00 am",
    "11:30 am",
    "12:00 pm",
  ];
  const week = [
    { day: "SUN", date: 4, selected: true },
    { day: "MON", date: 5, selected: false },
    { day: "TUE", date: 6, selected: false },
    { day: "WED", date: 7, selected: false },
    { day: "THU", date: 8, selected: false },
    { day: "FRI", date: 9, selected: false },
    { day: "SAT", date: 10, selected: false },
  ];
  const price =
    page.price != null
      ? `${page.currency === "NPR" ? "Rs" : page.currency || "A$"} ${page.price}`
      : null;

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
      <div className="px-8 pt-6">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-8 pt-8 pb-6 text-center">
          <h2 className="text-[28px] font-semibold text-slate-900">Welcome!</h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="grid gap-8 px-8 pb-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-1">
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-slate-800">
                {page.title}
              </span>
              <span className="block text-[11px] text-slate-400">
                {page.durationMinutes} mins
                {price ? ` · ${price}` : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left"
            style={{ background: colorWash(color, 0.1), color }}
          >
            <CalendarClock className="h-4 w-4" />
            <span className="min-w-0 flex-1 text-[13px] font-medium">
              Date, Time & User
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-slate-700 hover:bg-slate-50">
            <User className="h-4 w-4 text-slate-400" />
            <span className="min-w-0 flex-1 text-[13px] font-medium">Your Info</span>
          </button>
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-semibold text-slate-800">October, 2026</p>
            <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600">
              {page.timezone || "Asia/Kathmandu"}
            </div>
          </div>
          <div className="mb-6 flex items-center gap-2">
            <span className="text-slate-300">‹</span>
            {week.map((item) => (
              <div key={item.date} className="flex w-12 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-slate-400">{item.day}</span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold",
                    item.selected ? "text-white" : "text-slate-700",
                  )}
                  style={item.selected ? { background: color } : undefined}
                >
                  {item.date}
                </span>
              </div>
            ))}
            <span className="text-slate-300">›</span>
          </div>
          <p className="mb-3 text-[12px] text-slate-400">Morning</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className="h-9 min-w-[92px] rounded-full border bg-white px-3 text-[12px]"
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

function ModernThemePreview({
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
  const timezone = page.timezone || "Asia/Kathmandu";
  const time = formatClockLabel(firstAvailabilityStart(page));
  const buttonText = branding.buttonText.trim() || "Book Appointment";

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
      <div className="px-10 pt-6">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-10 pt-10 pb-8">
          <h2 className="text-[28px] font-semibold text-slate-900">Welcome!</h2>
          <p className="mt-2 max-w-2xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="grid gap-5 px-10 pb-16 md:grid-cols-3">
        <ModernInfoCard
          icon={Clock}
          color={color}
          title={page.title}
          subtitle={`(${formatDurationHours(page.durationMinutes)})`}
        />
        <ModernInfoCard icon={User} color={color} title={host} />
        <ModernInfoCard icon={Calendar} color={color} title="4 Oct 2026" />
        <ModernInfoCard icon={Globe} color={color} title={timezone} />
        <ModernInfoCard icon={Clock} color={color} title={time} />
        <button
          type="button"
          className="flex min-h-[76px] items-center justify-center rounded-xl px-6 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          style={{ background: color }}
        >
          {buttonText}
        </button>
      </div>
      <PreviewFooter branding={branding} />
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
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const slots = [
    "08:00 am",
    "09:30 am",
    "10:00 am",
    "10:30 am",
    "11:00 am",
    "11:30 am",
    "12:00 pm",
  ];
  const price =
    page.price != null
      ? `${page.currency === "NPR" ? "Rs" : page.currency || "A$"} ${page.price}`
      : null;
  const time = formatClockLabel(firstAvailabilityStart(page));
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const leadingBlanks = 4;
  const monthDays = 31;
  const selectedDay = 4;
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
      <div className="px-10 pt-6">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      {branding.showBanner ? (
        <div className="px-10 pt-8 pb-6 text-center">
          <h2 className="text-[28px] font-semibold text-slate-900">Welcome!</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] text-slate-500">
            Book your appointment in a few simple steps. Choose a service, pick
            your date and time, and fill in your details. See you soon!
          </p>
        </div>
      ) : null}
      <div className="space-y-6 px-10 pb-16">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl bg-white px-5 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
        >
          <Clock className="h-5 w-5 shrink-0" style={{ color }} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-slate-800">
              Event Type
            </span>
            <span className="block text-[13px] text-slate-700">{page.title}</span>
            <span className="block text-[12px] text-slate-400">
              {formatDurationHours(page.durationMinutes)}
              {price ? ` · ${price}` : ""}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
        <div className="flex items-start gap-3 px-1">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} />
          <div>
            <p className="text-[13px] font-medium text-slate-800">
              Date, Time & User
            </p>
            <p className="text-[12px] text-slate-400">
              4 Oct 2026 · {time}
            </p>
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <div className="mb-4 flex items-center justify-center gap-6 text-[13px] font-medium text-slate-700">
              <span className="text-slate-300">‹</span>
              October, 2026
              <span className="text-slate-300">›</span>
            </div>
            <div className="grid grid-cols-7 gap-y-3 text-center">
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
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px]",
                    day === selectedDay ? "font-semibold text-white" : "text-slate-700",
                  )}
                  style={day === selectedDay ? { background: color } : undefined}
                >
                  {day ?? ""}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[14px] font-semibold text-slate-800">
              Slot Availability
            </p>
            <div className="mb-6 flex h-10 items-center rounded-lg border border-slate-200 px-3 text-[13px] text-slate-600">
              {page.timezone || "Asia/Kathmandu"}
            </div>
            <p className="mb-3 text-center text-[12px] text-slate-400">Morning</p>
            <div className="flex flex-wrap justify-center gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="h-9 min-w-[92px] rounded-full border bg-white px-3 text-[12px]"
                  style={{ borderColor: color, color }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
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
  const title =
    (branding.header.titleVisible && branding.header.title) ||
    branding.workspace.displayName ||
    "Booking";
  const color = branding.primaryColor;
  const host = calendarDefaultHost(page);
  const people = assignedCalendarMembers(page);
  const week = [
    { month: "Oct", date: 4, day: "SUN", selected: true },
    { month: "Oct", date: 5, day: "MON", selected: false },
    { month: "Oct", date: 6, day: "TUE", selected: false },
    { month: "Oct", date: 7, day: "WED", selected: false },
    { month: "Oct", date: 8, day: "THU", selected: false },
    { month: "Oct", date: 9, day: "FRI", selected: false },
    { month: "Oct", date: 10, day: "SAT", selected: false },
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
      <div className="px-10 pt-6">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      <div className="px-10 pt-8 pb-16">
        <button
          type="button"
          className="flex items-center gap-1 text-[13px] font-medium text-slate-700"
        >
          <span className="text-slate-400">‹</span>
          {host}
        </button>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-slate-500">Choose timezone</p>
          <div className="min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700">
            {page.timezone || "Asia/Kathmandu"}
          </div>
        </div>
        {branding.showUserAsCards ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {people.map((name, index) => (
              <div
                key={name}
                className="flex min-w-[160px] items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold text-white"
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
        <p className="mt-16 mb-8 text-center text-[15px] font-medium text-slate-800">
          Select a Day
        </p>
        <div className="flex items-end justify-center gap-3">
          <span className="mb-6 text-slate-300">‹</span>
          {week.map((item) => (
            <div key={item.date} className="flex w-14 flex-col items-center gap-1">
              <span className="text-[11px] text-slate-400">{item.month}</span>
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border text-[15px] font-semibold",
                  item.selected ? "text-white" : "bg-white",
                )}
                style={
                  item.selected
                    ? { background: color, borderColor: color }
                    : { color, borderColor: color }
                }
              >
                {item.date}
              </span>
              <span className="text-[10px] font-medium text-slate-400">{item.day}</span>
            </div>
          ))}
          <span className="mb-6 text-slate-300">›</span>
        </div>
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
      <div className="px-10 pt-6">
        <PreviewHeader branding={branding} title={title} compact />
      </div>
      <div className="grid gap-8 px-10 pt-8 pb-16 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        <div>
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
          <div className="space-y-2">
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
      className="mt-4 h-10 w-full rounded-lg bg-[#5A32A3] text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
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
