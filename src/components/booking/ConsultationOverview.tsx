"use client";

import { useState, type ReactNode } from "react";
import {
  Briefcase,
  ClipboardList,
  Clock,
  FileCheck,
  Info,
  Pencil,
  Send,
  Share2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ShareConsultationModal } from "@/components/booking/ShareConsultationModal";
import { initials } from "@/lib/activities/shared";
import { mergeNotificationPrefs, type NotificationRow } from "@/lib/booking/notify-prefs";
import {
  consultationModeLabel,
  formatBookingPrice,
  meetingModeLabel,
  type BookingPage,
} from "@/lib/booking/types";
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

function Avatar({ name, cover }: { name: string; cover?: string }) {
  if (cover) {
    return (
      <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl">
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white"
      style={{ backgroundColor: BRAND }}
    >
      {initials(name)}
    </span>
  );
}

export function ConsultationOverview({
  page,
  onClose,
  onEdit,
}: {
  page: BookingPage;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [section, setSection] = useState<OverviewSection>("details");
  const [shareOpen, setShareOpen] = useState(false);
  const mode = consultationModeLabel(page.consultationMode) || "One-to-One";
  const people = page.consultants?.length ? page.consultants : [page.owner];
  const paid = (page.price ?? 0) > 0;
  const current = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];

  return (
    <div className="-mx-3 -mt-4 flex min-h-0 flex-1 flex-col bg-[#F7F8FA] sm:-mx-5 sm:-mt-5 lg:-mx-7">
      <header className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={page.title} cover={page.coverImageUrl} />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-slate-900">
              {page.title}
            </p>
            <p className="text-[12px] text-slate-500">{mode}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-4 lg:flex-row lg:p-6">
        <aside className="w-full shrink-0 lg:w-[280px]">
          <nav className="rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition",
                    active ? "bg-[#F3ECFB]" : "hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-white text-[#5A32A3]"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
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
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-slate-900">
                {current.title}
              </h2>
              <span className="text-slate-300" title={current.hint}>
                <Info className="h-4 w-4" />
              </span>
            </div>
            {section === "details" ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
          </div>

          {section === "details" ? (
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
                  {page.status === "Live" ? "Public" : "Private"}
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
                  {page.description?.trim() || "—"}
                </Field>
                <Field label="Integration">
                  {page.calendlyEventTypeId ? "Calendly" : "Not integrated"}
                </Field>
              </div>
            </div>
          ) : null}

          {section === "consultants" ? (
            <div className="divide-y divide-slate-100">
              {people.map((name) => (
                <div key={name} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={name} />
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">
                      {name}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {page.consultantPriorities?.[name]
                        ? `${page.consultantPriorities[name]} priority`
                        : "Assigned user"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {section === "availability" ? (
            <div className="space-y-6 px-5 py-5">
              <div>
                <p className="mb-3 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
                  Working hours
                </p>
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  {page.availability.map((rule) => (
                    <div
                      key={rule.day}
                      className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-0"
                    >
                      <span className="text-[13px] font-medium text-slate-700">
                        {rule.day}
                      </span>
                      <span className="text-[13px] text-slate-600">
                        {rule.enabled ? `${rule.start} – ${rule.end}` : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="Slots per event">
                  {page.appointmentLimits?.slotsPerEvent || "No limit"}
                </Field>
                <Field label="Slots per customer">
                  {page.appointmentLimits?.slotsPerCustomer || "No limit"}
                </Field>
              </div>
            </div>
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
              <Field label="Max attendees">
                {page.maxAttendees ?? 1}
              </Field>
            </div>
          ) : null}

          {section === "notify" ? (
            <div className="divide-y divide-slate-100">
              {mergeNotificationPrefs(page.notifyPrefs as NotificationRow[] | undefined).map((row) => {
                const on = Object.entries(row.channels)
                  .filter(([, enabled]) => enabled)
                  .map(([channel]) => channel);
                return (
                  <div key={row.id} className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-slate-800">
                      {row.title}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {on.length ? on.join(", ") : "Off"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === "form" ? (
            <div className="px-5 py-5">
              {page.questions.length ? (
                <ul className="space-y-3">
                  {page.questions.map((question) => (
                    <li
                      key={question.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                    >
                      <span className="text-[13px] font-medium text-slate-800">
                        {question.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {question.required ? "Required" : "Optional"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-500">
                  No extra questions on this booking form.
                </p>
              )}
            </div>
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
