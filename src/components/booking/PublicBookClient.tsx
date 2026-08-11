"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  MapPin,
  Video,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Phone,
  DollarSign,
  Users,
  Download,
  ExternalLink,
} from "lucide-react";
import { confirmPublicBooking } from "@/lib/booking/actions";
import {
  getBookingByToken,
  getBookingPageBySlug,
  slotsForDate,
  publicManageUrl,
  consultationModeLabel,
  meetingModeLabel,
  meetingViaLabel,
  formatBookingPrice,
  recordBookingPageView,
  toLocalDateStr,
  bookingLocationLabel,
  buildBookingIcs,
  downloadBookingIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

type Step = "date" | "details" | "done";

export function PublicBookClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<BookingPage | null | undefined>(undefined);
  const searchParams = useSearchParams();
  const rescheduleToken = searchParams.get("reschedule") ?? undefined;

  useEffect(() => {
    const found = getBookingPageBySlug(slug) ?? null;
    setPage(found);
    if (found?.status === "Live") {
      recordBookingPageView(found.id);
      setPage(getBookingPageBySlug(slug) ?? found);
    }
  }, [slug]);

  if (page === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!page || page.status !== "Live") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Calendar className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Page unavailable</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This booking link is draft or doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return <BookFlow page={page} rescheduleToken={rescheduleToken} />;
}

function BookFlow({
  page,
  rescheduleToken,
}: {
  page: BookingPage;
  rescheduleToken?: string;
}) {
  const existing = useMemo(
    () => (rescheduleToken ? getBookingByToken(rescheduleToken) : undefined),
    [rescheduleToken],
  );

  const [step, setStep] = useState<Step>("date");
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState(existing?.guestName ?? "");
  const [email, setEmail] = useState(existing?.guestEmail ?? "");
  const [phone, setPhone] = useState(existing?.guestPhone ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(
    existing?.answers ?? {},
  );
  const [manageToken, setManageToken] = useState("");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
    }
    return cells;
  }, [anchor]);

  const slotOpts = useMemo(
    () => ({ excludeToken: rescheduleToken }),
    [rescheduleToken],
  );

  const slots = selectedDate
    ? slotsForDate(page, selectedDate, slotOpts)
    : [];

  function pickDate(d: Date) {
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  function goDetails() {
    if (!selectedDate || !selectedSlot) return;
    setStep("details");
  }

  function confirm() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    if (!email.trim() || !email.includes("@")) next.email = "Valid email required";
    for (const q of page.questions) {
      if (q.required && !answers[q.id]?.trim()) next[q.id] = "Required";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const dateStr = toLocalDateStr(selectedDate);
      const start = `${dateStr}T${selectedSlot}`;
      const result = confirmPublicBooking({
        page,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim() || undefined,
        start,
        answers,
        rescheduleToken,
      });
      setManageToken(result.manageToken);
      setConfirmed(result.booking);
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  const whenLabel =
    selectedDate && selectedSlot
      ? `${selectedDate.toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })} · ${slots.find((s) => s.start === selectedSlot)?.label ?? selectedSlot}`
      : confirmed
        ? confirmed.start
        : "";

  const locationLabel = bookingLocationLabel(page);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 sm:py-12">
      {page.coverImageUrl ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.coverImageUrl}
            alt=""
            className="h-40 w-full object-cover sm:h-48"
          />
        </div>
      ) : null}
      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          FinConnex
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {page.title}
        </h1>
        {rescheduleToken ? (
          <p className="mt-1 text-[12px] font-semibold text-amber-700">
            Rescheduling your booking
          </p>
        ) : null}
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-slate-500">
          {page.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5" />
            {page.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {page.eventType === "Consultation" && page.consultationMode
              ? consultationModeLabel(page.consultationMode)
              : page.eventType}
          </span>
          {page.eventType === "Consultation" && page.meetingMode ? (
            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1">
              {meetingModeLabel(page.meetingMode)}
            </span>
          ) : null}
          {page.eventType === "Consultation" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
              <DollarSign className="h-3.5 w-3.5" />
              {formatBookingPrice(page.price, page.currency ?? "AUD")}
            </span>
          ) : null}
          {page.consultationMode === "group" && page.maxAttendees ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
              <Users className="h-3.5 w-3.5" />
              Up to {page.maxAttendees}
            </span>
          ) : null}
          {page.eventType === "Consultation" && page.meetingVia ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
              {page.meetingVia === "video" ? (
                <Video className="h-3.5 w-3.5" />
              ) : page.meetingVia === "phone" ? (
                <Phone className="h-3.5 w-3.5" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {meetingViaLabel(page.meetingVia)}
            </span>
          ) : (
            <>
              {page.location ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {page.location}
                </span>
              ) : null}
              {page.videoLink ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
                  <Video className="h-3.5 w-3.5" />
                  Video call
                </span>
              ) : null}
            </>
          )}
        </div>
        {page.eventType === "Consultation" &&
        page.consultants &&
        page.consultants.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {page.consultants.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
                    avatarColor(n),
                  )}
                >
                  {initials(n)}
                </span>
                {n}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        {step === "date" ? (
          <div className="grid md:grid-cols-2">
            <div className="border-b border-slate-100 p-4 md:border-r md:border-b-0 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-slate-900">
                  {anchor.toLocaleDateString("en-AU", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setAnchor(
                        new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                      )
                    }
                    className="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-50"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAnchor(
                        new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
                      )
                    }
                    className="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-50"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={`${d}-${i}`}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d, i) => {
                  if (!d) return <span key={`e-${i}`} />;
                  const hasSlots = slotsForDate(page, d, slotOpts).length > 0;
                  const selected =
                    selectedDate &&
                    d.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!hasSlots}
                      onClick={() => pickDate(d)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg text-[12px] font-semibold transition-all",
                        selected
                          ? "bg-violet-600 text-white"
                          : hasSlots
                            ? "text-slate-800 hover:bg-violet-50"
                            : "text-slate-300",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-slate-400">
                Min notice {page.minNoticeHours ?? 2}h · Book up to{" "}
                {page.maxAdvanceDays ?? 60} days ahead
              </p>
            </div>

            <div className="flex flex-col p-4 sm:p-5">
              <p className="mb-3 text-[13px] font-semibold text-slate-900">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-AU", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })
                  : "Select a date"}
              </p>
              <div className="min-h-[200px] flex-1 space-y-1.5 overflow-y-auto">
                {selectedDate && slots.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-slate-400">
                    No times this day
                  </p>
                ) : null}
                {!selectedDate ? (
                  <p className="py-8 text-center text-[12px] text-slate-400">
                    Pick a date to see times
                  </p>
                ) : null}
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => setSelectedSlot(s.start)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg border py-2 text-[12px] font-semibold transition-all",
                      selectedSlot === s.start
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-slate-200 text-slate-700 hover:border-violet-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!selectedDate || !selectedSlot}
                onClick={goDetails}
                className="mt-4 h-10 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="p-4 sm:p-6">
            <button
              type="button"
              onClick={() => setStep("date")}
              className="mb-4 inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <p className="mb-4 text-[13px] font-semibold text-violet-700">
              {whenLabel}
            </p>
            <div className="space-y-3">
              <Field
                label="Your name"
                error={errors.name}
                value={name}
                onChange={setName}
                placeholder="Full name"
              />
              <Field
                label="Email"
                error={errors.email}
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                type="email"
              />
              <Field
                label="Phone (optional)"
                value={phone}
                onChange={setPhone}
                placeholder="+61 …"
              />
              {page.questions.map((q) => (
                <Field
                  key={q.id}
                  label={q.label + (q.required ? "" : " (optional)")}
                  error={errors[q.id]}
                  value={answers[q.id] ?? ""}
                  onChange={(v) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: v }))
                  }
                  placeholder={q.label}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="mt-5 h-10 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700 disabled:opacity-40"
            >
              {submitting
                ? "Confirming…"
                : rescheduleToken
                  ? "Confirm new time"
                  : "Confirm booking"}
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Creates a lead &amp; calendar meeting · Confirmation &amp; reminder
              queued
            </p>
          </div>
        ) : null}

        {step === "done" && confirmed ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">You&apos;re booked</h2>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500">
              {page.title}
              <br />
              <span className="font-medium text-slate-700">{whenLabel}</span>
            </p>
            {confirmed.confirmationMessage ? (
              <p className="mt-3 max-w-md rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                {confirmed.confirmationMessage}
              </p>
            ) : (
              <p className="mt-3 text-[12px] text-slate-400">
                Confirmation sent to {email}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <a
                href={googleCalendarUrl({
                  title: page.title,
                  details: confirmed.confirmationMessage || page.description,
                  location: locationLabel,
                  start: confirmed.start,
                  end: confirmed.end,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3 w-3" />
                Google Calendar
              </a>
              <a
                href={outlookCalendarUrl({
                  title: page.title,
                  details: confirmed.confirmationMessage || page.description,
                  location: locationLabel,
                  start: confirmed.start,
                  end: confirmed.end,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3 w-3" />
                Outlook
              </a>
              <button
                type="button"
                onClick={() =>
                  downloadBookingIcs(
                    `${page.slug}.ics`,
                    buildBookingIcs({
                      title: page.title,
                      description:
                        confirmed.confirmationMessage || page.description,
                      location: locationLabel,
                      start: confirmed.start,
                      end: confirmed.end,
                      guestEmail: confirmed.guestEmail,
                    }),
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3 w-3" />
                Download .ics
              </button>
            </div>
            {manageToken ? (
              <Link
                href={publicManageUrl(page.slug, manageToken)}
                className="mt-6 text-[12px] font-semibold text-violet-700 hover:underline"
              >
                Reschedule or cancel
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        Powered by FinConnex · {page.timezone}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-xl border bg-white px-3 text-[13px] outline-none transition-all",
          error
            ? "border-rose-300"
            : "border-slate-200 hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
        )}
      />
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}
