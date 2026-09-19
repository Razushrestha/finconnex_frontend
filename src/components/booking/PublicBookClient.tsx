"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import { confirmPublicBooking } from "@/lib/booking/actions";
import {
  crmEventTypeIdOf,
  listCrmAvailableSlots,
  listCrmEventTypePages,
  localHHmmFromIso,
  slotDateKey,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  getBookingByToken,
  getBookingPageBySlug,
  slotsForDate,
  publicManageUrl,
  recordBookingPageView,
  toLocalDateStr,
  bookingLocationLabel,
  buildBookingIcs,
  downloadBookingIcs,
  googleCalendarUrl,
  upsertBookingPage,
  bookingPageMatchesSlug,
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
    let alive = true;
    void (async () => {
      const adopt = (found: BookingPage) => {
        const live = found.status === "Live" ? found : { ...found, status: "Live" as const };
        upsertBookingPage(live);
        if (live.status === "Live") recordBookingPageView(live.id);
        setPage(getBookingPageBySlug(slug) ?? live);
      };

      const local = getBookingPageBySlug(slug);
      if (local) {
        adopt(local);
        return;
      }

      const crmPages = await tryCrmBooking(() => listCrmEventTypePages());
      if (!alive) return;
      const matched = crmPages?.find((page) => bookingPageMatchesSlug(page, slug));
      if (matched) {
        adopt(matched);
        return;
      }

      try {
        const res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
          credentials: "same-origin",
        });
        if (!alive) return;
        if (res.ok) {
          const remote = (await res.json()) as BookingPage;
          if (remote?.slug || remote?.title) {
            adopt(remote);
            return;
          }
        }
      } catch {
        /* public catalog optional */
      }
      setPage(null);
    })();
    return () => {
      alive = false;
    };
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
  const [crmSlots, setCrmSlots] = useState<string[]>([]);
  const [crmSlotDays, setCrmSlotDays] = useState<Set<string>>(new Set());
  const [guestTz, setGuestTz] = useState(() => {
    const browser =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "";
    return browser || page.timezone || "Asia/Kathmandu";
  });
  const [dialCode, setDialCode] = useState(() => {
    const browser =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "";
    return dialCodeForTimezone(browser || page.timezone || "Asia/Kathmandu");
  });

  useEffect(() => {
    const eventTypeId = crmEventTypeIdOf(page);
    if (!eventTypeId) {
      setCrmSlots([]);
      setCrmSlotDays(new Set());
      return;
    }
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);
    void tryCrmBooking(() =>
      listCrmAvailableSlots({
        eventTypeId,
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: page.timezone,
      }),
    ).then((rows) => {
      if (!rows?.length) {
        setCrmSlots([]);
        setCrmSlotDays(new Set());
        return;
      }
      const days = new Set(rows.map((row) => slotDateKey(row.startTime)).filter(Boolean));
      setCrmSlotDays(days);
      if (!selectedDate) {
        setCrmSlots([]);
        return;
      }
      const key = toLocalDateStr(selectedDate);
      setCrmSlots(
        rows
          .filter((row) => slotDateKey(row.startTime) === key)
          .map((row) => localHHmmFromIso(row.startTime)),
      );
    });
  }, [page.crmEventTypeId, page.id, page.timezone, anchor, selectedDate]);

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startPad = (first.getDay() + 6) % 7;
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

  const slotPage = useMemo(
    () => ({ ...page, durationMinutes: 15, bufferMinutes: 0 }),
    [page],
  );

  const localSlots = selectedDate
    ? slotsForDate(slotPage, selectedDate, slotOpts)
    : [];
  const slots = (crmSlots.length ? crmSlots : localSlots).map((item) =>
    typeof item === "string"
      ? { start: item, label: formatPublicSlotLabel(item) }
      : { start: item.start, label: formatPublicSlotLabel(item.start) },
  );

  const hostName = page.consultants?.[0] || page.owner || "Host";

  useEffect(() => {
    if (selectedDate) return;
    const daysInMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0,
    ).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), d);
      const dayKey = toLocalDateStr(date);
      const hasSlots = crmSlotDays.size
        ? crmSlotDays.has(dayKey)
        : slotsForDate(slotPage, date, slotOpts).length > 0;
      if (hasSlots) {
        setSelectedDate(date);
        return;
      }
    }
  }, [anchor, crmSlotDays, page, selectedDate, slotOpts, slotPage]);

  function pickDate(d: Date) {
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  async function confirm() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    if (!email.trim() || !email.includes("@")) next.email = "Valid email required";
    if (!phone.trim()) next.phone = "Required";
    for (const q of extraGuestQuestions(page.questions)) {
      if (q.required && !answers[q.id]?.trim()) next[q.id] = "Required";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const dateStr = toLocalDateStr(selectedDate);
      const start = `${dateStr}T${selectedSlot}`;
      const localPhone = phone.trim().replace(/^\+/, "");
      const result = await confirmPublicBooking({
        page,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: `${dialCode} ${localPhone}`.trim(),
        start,
        timezone: guestTz,
        answers,
        rescheduleToken,
      });
      setManageToken(result.manageToken);
      setConfirmed(result.booking);
      setStep("done");
    } catch {
      setErrors((prev) => ({
        ...prev,
        form: "Could not complete this booking. Try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDateLabel =
    selectedDate && selectedSlot
      ? `${selectedDate.getDate()} ${selectedDate.toLocaleDateString("en-US", {
          month: "short",
        })} ${selectedDate.getFullYear()}`
      : "";
  const confirmTimeLabel = selectedSlot
    ? slots.find((s) => s.start === selectedSlot)?.label ??
      formatPublicSlotLabel(selectedSlot)
    : "";
  const timezoneGmtLabel = publicTimezoneGmt(guestTz);
  const whenLabel =
    selectedDate && selectedSlot
      ? `${confirmDateLabel} ${confirmTimeLabel}`
      : confirmed
        ? confirmed.start
        : "";

  const tzOptions = Array.from(
    new Set(
      [
        guestTz,
        page.timezone,
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "",
        "Asia/Kathmandu",
        "Australia/Sydney",
        "America/New_York",
        "Europe/London",
      ].filter(Boolean),
    ),
  );

  const locationLabel = bookingLocationLabel(page);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F3F4F6] px-3 py-8 sm:py-12">
      <div className="w-full max-w-[980px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
        {step === "date" ? (
          <div className="grid lg:grid-cols-[240px_minmax(0,1fr)_230px]">
            <aside className="flex flex-col border-b border-slate-100 p-6 lg:border-r lg:border-b-0">
              <div className="mb-4 h-[72px] w-[72px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                {page.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex h-full w-full items-center justify-center text-lg font-semibold text-white",
                      avatarColor(page.title),
                    )}
                  >
                    {initials(page.title)}
                  </span>
                )}
              </div>
              <h1 className="text-[22px] leading-tight font-semibold text-slate-900">
                {page.title}
              </h1>
              {rescheduleToken ? (
                <p className="mt-1 text-[12px] font-semibold text-amber-700">
                  Rescheduling your booking
                </p>
              ) : null}
              <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-600">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white",
                    avatarColor(hostName),
                  )}
                >
                  {initials(hostName)}
                </span>
                <span className="truncate">{hostName}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                {page.durationMinutes} mins
              </div>
              {page.description ? (
                <p className="mt-4 text-[12px] leading-5 text-slate-500">
                  {page.description}
                </p>
              ) : null}
              <div className="mt-auto hidden pt-10 lg:flex">
                <PoweredByBookings />
              </div>
            </aside>

            <section className="border-b border-slate-100 px-6 py-6 lg:border-r lg:border-b-0">
              <h2 className="mb-5 text-[17px] font-semibold text-slate-900">
                Select date and time
              </h2>
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() =>
                    setAnchor(
                      new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-[14px] font-medium text-slate-700">
                  {anchor.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setAnchor(
                      new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
                    )
                  }
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={`${d}-${i}`} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((d, i) => {
                  if (!d) return <span key={`e-${i}`} className="h-11" />;
                  const dayKey = toLocalDateStr(d);
                  const hasSlots = crmSlotDays.size
                    ? crmSlotDays.has(dayKey)
                    : slotsForDate(slotPage, d, slotOpts).length > 0;
                  const selected =
                    selectedDate &&
                    d.toDateString() === selectedDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!hasSlots}
                      onClick={() => pickDate(d)}
                      className="relative flex h-11 items-center justify-center"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium",
                          selected
                            ? "bg-[#5B4BDB] text-white"
                            : hasSlots
                              ? "text-slate-800 hover:bg-slate-100"
                              : "text-slate-300",
                        )}
                      >
                        {d.getDate()}
                      </span>
                      {isToday && !selected ? (
                        <span className="absolute bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[5px] border-x-transparent border-b-[#5B4BDB]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <label className="mt-8 block text-[13px] font-semibold text-slate-800">
                Time Zone
              </label>
              <select
                value={guestTz}
                onChange={(e) => {
                  setGuestTz(e.target.value);
                  setDialCode(dialCodeForTimezone(e.target.value));
                }}
                className="mt-1 w-full appearance-none border-0 bg-transparent py-1 text-[13px] text-slate-500 outline-none"
              >
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {publicTimezoneLabel(tz)}
                  </option>
                ))}
              </select>
            </section>

            <section className="flex max-h-[560px] min-h-[320px] flex-col p-5">
              <h3 className="mb-4 text-center text-[15px] font-semibold text-slate-800">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a date"}
              </h3>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {!selectedDate ? (
                  <p className="py-10 text-center text-[12px] text-slate-400">
                    Pick a date to see times
                  </p>
                ) : null}
                {selectedDate && slots.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-slate-400">
                    No times this day
                  </p>
                ) : null}
                {slots.map((s) =>
                  selectedSlot === s.start ? (
                    <div key={s.start} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSlot(null)}
                        className="h-11 min-w-0 flex-1 rounded-full bg-[#4C4A6A] text-[13px] font-medium text-white"
                      >
                        {s.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep("details")}
                        className="h-11 min-w-0 flex-1 rounded-full bg-[#5B4BDB] text-[13px] font-semibold text-white hover:brightness-110"
                      >
                        Next
                      </button>
                    </div>
                  ) : (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setSelectedSlot(s.start)}
                      className="h-11 w-full rounded-full border border-slate-200 text-[13px] font-medium text-slate-700 hover:border-[#5B4BDB]/50"
                    >
                      {s.label}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-4 lg:hidden">
                <PoweredByBookings />
              </div>
            </section>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-slate-100 px-6 py-5 lg:border-r lg:border-b-0">
              <button
                type="button"
                onClick={() => setStep("date")}
                className="mb-5 inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                  {page.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-full w-full items-center justify-center text-sm font-semibold text-white",
                        avatarColor(page.title),
                      )}
                    >
                      {initials(page.title)}
                    </span>
                  )}
                </div>
                <h1 className="text-[20px] font-semibold text-slate-900">
                  {page.title}
                </h1>
              </div>
              <div className="mt-5 space-y-3 text-[13px] text-slate-600">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white",
                      avatarColor(hostName),
                    )}
                  >
                    {initials(hostName)}
                  </span>
                  <span className="truncate">{hostName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{whenLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{page.durationMinutes} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{guestTz}</span>
                </div>
              </div>
            </aside>
            <div className="px-6 py-8 sm:px-10">
              <h2 className="mb-6 text-[22px] font-semibold text-slate-900">
                Please enter your details
              </h2>
              <div className="max-w-[420px] space-y-4">
                <Field
                  label="Name"
                  required
                  error={errors.name}
                  value={name}
                  onChange={setName}
                  placeholder="Name"
                />
                <Field
                  label="Email"
                  required
                  error={errors.email}
                  value={email}
                  onChange={setEmail}
                  placeholder="Email"
                  type="email"
                />
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-800">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <PhoneNumberField
                    dialCode={dialCode}
                    phone={phone}
                    error={errors.phone}
                    onDialCodeChange={setDialCode}
                    onPhoneChange={setPhone}
                  />
                </div>
                {extraGuestQuestions(page.questions).map((q) => (
                  <Field
                    key={q.id}
                    label={q.label}
                    required={q.required}
                    error={errors[q.id]}
                    value={answers[q.id] ?? ""}
                    onChange={(v) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: v }))
                    }
                    placeholder={q.label}
                  />
                ))}
                {errors.form ? (
                  <p className="text-[13px] font-medium text-rose-600">{errors.form}</p>
                ) : null}
                <button
                  type="button"
                  onClick={confirm}
                  disabled={submitting}
                  className="mt-2 h-12 w-full rounded-lg bg-[#5B4BDB] text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-40"
                >
                  {submitting ? "Scheduling…" : "Schedule Appointment"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "done" && confirmed ? (
          <div className="flex flex-col items-center px-6 py-14 sm:px-10">
            <h2 className="max-w-xl text-center text-[28px] leading-tight font-semibold text-slate-900">
              Appointment confirmed with {hostName}!
            </h2>
            <div className="relative mt-10 w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <button
                type="button"
                className="absolute top-4 right-4 rounded-md p-1 text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                aria-label="More"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-5">
                <ConfirmedCalendarMark />
                <div className="min-w-0 pt-1">
                  <p className="text-[16px] font-semibold text-[#5B4BDB]">
                    {confirmDateLabel} | {confirmTimeLabel}
                  </p>
                  <p className="mt-1 text-[14px] text-slate-700">{page.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {guestTz} {timezoneGmtLabel}
                  </p>
                  <p className="mt-5 text-[13px]">
                    <a
                      href={googleCalendarUrl({
                        title: page.title,
                        details: page.description,
                        location: locationLabel,
                        start: confirmed.start,
                        end: confirmed.end,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#3B82F6] hover:underline"
                    >
                      + Add to Calendar
                    </a>
                    <span className="mx-1.5 text-[#3B82F6]">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        downloadBookingIcs(
                          `${page.slug}.ics`,
                          buildBookingIcs({
                            title: page.title,
                            description: page.description,
                            location: locationLabel,
                            start: confirmed.start,
                            end: confirmed.end,
                            guestEmail: confirmed.guestEmail,
                          }),
                        )
                      }
                      className="font-medium text-[#3B82F6] hover:underline"
                    >
                      Download as ICS
                    </button>
                  </p>
                </div>
              </div>
            </div>
            {manageToken ? (
              <Link
                href={publicManageUrl(page.slug, manageToken)}
                className="mt-6 text-[12px] text-slate-400 hover:text-slate-600 hover:underline"
              >
                Reschedule or cancel
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatPublicSlotLabel(hhmm: string) {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw) || 0;
  if (!Number.isFinite(hour)) return hhmm;
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function publicTimezoneGmt(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const raw =
      parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    const offset = raw.replace(/^GMT/i, "").trim();
    if (!offset) return "GMT";
    return offset.startsWith("+") || offset.startsWith("-")
      ? `GMT ${offset}`
      : `GMT ${offset}`;
  } catch {
    return "";
  }
}

function ConfirmedCalendarMark() {
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <span className="absolute top-1 left-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
      <span className="absolute top-4 -left-0.5 h-1.5 w-1.5 rounded-full bg-orange-400" />
      <span className="absolute top-0 right-3 h-1.5 w-1.5 rounded-full bg-violet-400" />
      <span className="absolute right-0 bottom-6 h-1.5 w-1.5 rounded-full bg-sky-300" />
      <span className="absolute bottom-2 left-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
      <span className="absolute right-2 bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <div className="absolute inset-1 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-[#F7F8FC]">
        <div className="h-3 bg-slate-100" />
        <div className="flex flex-1 items-center justify-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-400 text-slate-500">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path
                d="M3.5 8.2 6.4 11l6.1-6.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function publicTimezoneLabel(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const offset =
      parts.find((part) => part.type === "timeZoneName")?.value.replace(
        "GMT",
        "",
      ) || "";
    const pretty = offset.startsWith("+") || offset.startsWith("-")
      ? offset
      : offset
        ? `+${offset}`
        : "";
    return pretty ? `${tz} (${pretty})` : tz;
  } catch {
    return tz;
  }
}

function PoweredByBookings() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <span>Powered by</span>
      <span className="grid grid-cols-2 gap-0.5">
        <span className="h-2 w-2 rounded-[2px] bg-orange-400" />
        <span className="h-2 w-2 rounded-[2px] bg-sky-400" />
        <span className="h-2 w-2 rounded-[2px] bg-violet-500" />
        <span className="h-2 w-2 rounded-[2px] bg-emerald-400" />
      </span>
      <span className="font-semibold text-slate-600">Bookings</span>
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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-lg border bg-white px-3 text-[13px] outline-none transition-all placeholder:text-slate-400",
          error
            ? "border-rose-300"
            : "border-slate-200 hover:border-violet-300 focus:border-[#5B4BDB] focus:shadow-[0_0_0_3px_rgba(91,75,219,0.12)]",
        )}
      />
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

const PHONE_DIAL_CODES = [
  { code: "+977", iso: "NP" },
  { code: "+61", iso: "AU" },
  { code: "+1", iso: "US" },
  { code: "+44", iso: "GB" },
  { code: "+91", iso: "IN" },
  { code: "+64", iso: "NZ" },
] as const;

function PhoneNumberField({
  dialCode,
  phone,
  error,
  onDialCodeChange,
  onPhoneChange,
}: {
  dialCode: string;
  phone: string;
  error?: string;
  onDialCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected =
    PHONE_DIAL_CODES.find((row) => row.code === dialCode) ?? PHONE_DIAL_CODES[0];

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={cn(
          "flex h-11 items-center rounded-lg border bg-white",
          error ? "border-rose-300" : "border-slate-200",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-full shrink-0 items-center gap-1 px-3 text-[13px] font-medium text-slate-700"
          aria-label="Country code"
          aria-expanded={open}
        >
          <span className="w-6 text-left tabular-nums">{selected.iso}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
        <span className="h-5 w-px shrink-0 bg-slate-200" />
        <span className="px-2.5 text-[13px] tabular-nums text-slate-600">
          {selected.code}
        </span>
        <input
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="Contact Number"
          className="h-full min-w-0 flex-1 border-0 bg-transparent pr-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
      {open ? (
        <ul className="absolute z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {PHONE_DIAL_CODES.map((row) => (
            <li key={row.code}>
              <button
                type="button"
                onClick={() => {
                  onDialCodeChange(row.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                  row.code === selected.code
                    ? "bg-slate-50 font-medium text-slate-900"
                    : "text-slate-700",
                )}
              >
                <span className="w-6 tabular-nums text-slate-500">{row.iso}</span>
                <span className="tabular-nums">{row.code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

function extraGuestQuestions(
  questions: { id: string; label: string; required?: boolean }[],
) {
  return questions.filter((question) => {
    const id = question.id.trim().toLowerCase();
    const label = question.label.trim().toLowerCase();
    if (["name", "email", "phone", "guests", "contact"].includes(id)) {
      return false;
    }
    if (
      label === "name" ||
      label === "email" ||
      label === "contact number" ||
      label.startsWith("invite guest")
    ) {
      return false;
    }
    return true;
  });
}

function dialCodeForTimezone(tz: string) {
  if (/kathmandu|nepal/i.test(tz)) return "+977";
  if (/sydney|melbourne|perth|brisbane|hobart|adelaide/i.test(tz)) return "+61";
  if (/london|dublin/i.test(tz)) return "+44";
  if (/kolkata|calcutta|mumbai|delhi|kolkata/i.test(tz)) return "+91";
  if (/auckland/i.test(tz)) return "+64";
  if (/new_york|chicago|los_angeles|denver|toronto/i.test(tz)) return "+1";
  return "+977";
}
