"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  Globe,
  MoreHorizontal,
  User,
  Users,
  X,
  Search,
} from "lucide-react";
import { confirmPublicBooking } from "@/lib/booking/actions";
import { sanitizeDescriptionHtml } from "@/lib/booking/description-html";
import {
  PublicBookingError,
  fetchPublicSite,
  type PublicSiteService,
  fetchPublicSlots,
  fetchPublishedCrmRef,
} from "@/lib/booking/public-client";
import {
  formatWorkingHoursClock,
  timeInZone,
  slotDaysInZone,
  type PublicSlot,
  type PublicSlotDays,
} from "@/lib/booking/public-crm";
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
  assignedCalendarMembers,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";
import { AssignedHosts } from "@/components/booking/AssignedHosts";
import {
  ianaTimezoneFromLabel,
  isPastBookingDate,
  isPastBookingStart,
  todayIsoInTimezone,
} from "@/lib/booking/timezones";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  addInviteGuestEmails,
  inviteGuestEmailsLabel,
  inviteGuestsField,
  isInviteGuestsQuestion,
  MAX_INVITE_GUEST_EMAILS,
} from "@/lib/booking/invite-guests";
import {
  normalizeBookingPageBranding,
  readLocalBookingPageBranding,
  type BookingPageBranding,
  brandingBackgroundStyle,
} from "@/lib/booking/page-branding";
import {
  PHONE_COUNTRIES,
  phoneCountryByIso,
  phoneCountryForCode,
  searchPhoneCountries,
  type PhoneCountry,
} from "@/lib/phone/countries";
import {
  currentZoneName,
  timezoneOptionLabel,
} from "@/lib/booking/all-timezones";
import { TimeZonePicker } from "@/components/booking/TimeZonePicker";
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
        const live =
          found.status === "Live"
            ? found
            : { ...found, status: "Live" as const };
        upsertBookingPage(live, { publish: false });
        if (live.status === "Live") recordBookingPageView(live.id);
        setPage(getBookingPageBySlug(slug) ?? live);
      };

      const local = getBookingPageBySlug(slug);
      if (local) {
        // A copy saved here before the host connected the page to the CRM has
        // no address to book through; ask the server before showing it.
        const crmPublic = local.crmPublic
          ? null
          : await fetchPublishedCrmRef(slug);
        if (!alive) return;
        adopt(crmPublic ? { ...local, crmPublic } : local);
        return;
      }

      const crmPages = await tryCrmBooking(() => listCrmEventTypePages());
      if (!alive) return;
      const matched = crmPages?.find((page) =>
        bookingPageMatchesSlug(page, slug),
      );
      if (matched) {
        adopt(matched);
        return;
      }

      try {
        // A 404 can come from a server that has not seen this page yet; a
        // couple of quick retries usually reach one that has.
        let res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
          credentials: "same-origin",
        });
        for (
          let attempt = 1;
          res.status === 404 && attempt <= 3 && alive;
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
            credentials: "same-origin",
            cache: "no-store",
          });
        }
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
  const [addressValues, setAddressValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [manageToken, setManageToken] = useState("");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inviteField = inviteGuestsField(page.questions);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteDraft, setInviteDraft] = useState("");
  const [pageBranding, setPageBranding] = useState<BookingPageBranding>(() =>
    readLocalBookingPageBranding(page.id),
  );
  // The Fresh layout books in separate steps (day, then time, then details)
  // and pages through days a week at a time instead of showing a month.
  const fresh = pageBranding.layout === "fresh";
  const [freshStage, setFreshStage] = useState<"day" | "time">("day");
  // Basic walks Event Type → Date, Time & User → Your Info, with a step menu
  // on the left that fills in as the guest goes.
  const basic = pageBranding.layout === "basic";
  // A /book/:slug link names one event, so the guest starts on its calendar.
  const [basicStage, setBasicStage] = useState<"service" | "schedule">(
    "schedule",
  );
  const [siteServices, setSiteServices] = useState<PublicSiteService[]>([]);
  // Both page through days a week at a time instead of showing a month.
  const weekly = fresh || basic;
  // Classic stacks Event Type, Date, Time & User and Your Info as cards;
  // Modern picks everything from tiles and takes details in a sidebar.
  const classic = pageBranding.layout === "classic";
  const modern = pageBranding.layout === "modern";
  const [serviceListOpen, setServiceListOpen] = useState(false);
  // Every layout but Compact wears the workspace's brand colour.
  const branded = weekly || classic || modern;
  const [weekStart, setWeekStart] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6,
  );
  const [crmSlots, setCrmSlots] = useState<string[]>([]);
  const [crmSlotDays, setCrmSlotDays] = useState<Set<string>>(new Set());
  const eventTz = ianaTimezoneFromLabel(page.timezone);
  const [guestTz, setGuestTz] = useState(eventTz);
  const [dialCode, setDialCode] = useState(() => dialCodeForTimezone(eventTz));

  // Pages the host connected to the CRM list slots (and take bookings) through
  // the public API, which needs no login. `publicRefresh` re-reads them after a
  // clash; the result is keyed so a stale month/timezone is never shown.
  const publicSlug = page.crmPublic ? page.slug || page.title : "";
  const monthFrom = toLocalDateStr(
    new Date(anchor.getFullYear(), anchor.getMonth(), 1),
  );
  const monthTo = toLocalDateStr(
    new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
  );
  // A week can run into the next month; load its days too.
  const rangeFrom =
    weekly && toLocalDateStr(weekStart) < monthFrom
      ? toLocalDateStr(weekStart)
      : monthFrom;
  const rangeTo =
    weekly && toLocalDateStr(weekEnd) > monthTo
      ? toLocalDateStr(weekEnd)
      : monthTo;
  const [publicRefresh, setPublicRefresh] = useState(0);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [publicResult, setPublicResult] = useState<{
    key: string;
    days?: PublicSlotDays;
    error?: string;
  } | null>(null);
  // Slots are instants: they are loaded once per date range and only re-read
  // when the guest changes time zone, so the key leaves the zone out.
  const publicKey = publicSlug
    ? `${publicSlug}|${rangeFrom}|${rangeTo}|${publicRefresh}`
    : "";

  useEffect(() => {
    if (!publicSlug) return;
    let alive = true;
    void fetchPublicSite(publicSlug).then((site) => {
      if (!alive || !site) return;
      if (site.branding)
        setPageBranding(normalizeBookingPageBranding(site.branding));
      setSiteServices(site.services);
    });
    return () => {
      alive = false;
    };
  }, [publicSlug]);

  useEffect(() => {
    if (!publicKey) return;
    let alive = true;
    // A day either side, so a guest far from the event's zone still gets the
    // edge days' slots once they are re-read on their own calendar.
    void fetchPublicSlots(publicSlug, {
      from: shiftIsoDate(rangeFrom, -1),
      to: shiftIsoDate(rangeTo, 1),
      timezone: eventTz,
    }).then((res) => {
      if (!alive) return;
      setPublicResult(
        res.ok
          ? { key: publicKey, days: res.days }
          : { key: publicKey, error: res.message },
      );
    });
    return () => {
      alive = false;
    };
  }, [publicKey, publicSlug, rangeFrom, rangeTo, eventTz]);

  const publicCurrent = publicResult?.key === publicKey ? publicResult : null;
  const loadedDays = publicCurrent?.days;
  // The guest's calendar days and clock, worked out here — no round trip.
  const publicDays = useMemo(
    () => slotDaysInZone(loadedDays, guestTz),
    [loadedDays, guestTz],
  );
  const publicLoading = !!publicKey && !publicCurrent;
  const publicError = publicCurrent?.error;

  useEffect(() => {
    const eventTypeId = crmEventTypeIdOf(page);
    if (page.crmPublic || !eventTypeId) {
      setCrmSlots([]);
      setCrmSlotDays(new Set());
      return;
    }
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const weekLast = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 6,
      23,
      59,
      59,
    );
    const from = weekly && weekStart < monthStart ? weekStart : monthStart;
    const to = weekly && weekLast > monthEnd ? weekLast : monthEnd;
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
      const days = new Set(
        rows.map((row) => slotDateKey(row.startTime)).filter(Boolean),
      );
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
  }, [
    page.crmEventTypeId,
    page.crmPublic,
    page.id,
    page.timezone,
    anchor,
    selectedDate,
    weekly,
    weekStart,
  ]);

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

  function dayHasSlots(d: Date) {
    const dayKey = toLocalDateStr(d);
    return page.crmPublic
      ? !!publicDays?.has(dayKey)
      : crmSlotDays.size
        ? crmSlotDays.has(dayKey)
        : slotsForDate(slotPage, d, slotOpts).length > 0;
  }

  const todayKey = todayIsoInTimezone(guestTz || page.timezone);
  const nowMonth = new Date();
  const canPrevMonth =
    anchor.getFullYear() > nowMonth.getFullYear() ||
    (anchor.getFullYear() === nowMonth.getFullYear() &&
      anchor.getMonth() > nowMonth.getMonth());

  const localSlots = selectedDate
    ? slotsForDate(slotPage, selectedDate, slotOpts)
    : [];

  // The CRM's open times for the chosen day, on the guest's own clock.
  const publicSlotList = useMemo(() => {
    if (!publicDays || !selectedDate) return [];
    const rows = publicDays.get(toLocalDateStr(selectedDate)) ?? [];
    const byTime = new Map<string, PublicSlot & { start: string }>();
    for (const slot of rows) {
      const start = timeInZone(slot.startAt, guestTz);
      if (start && !byTime.has(start)) byTime.set(start, { ...slot, start });
    }
    return [...byTime.values()].sort(
      (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt),
    );
  }, [publicDays, selectedDate, guestTz]);

  const slots = (
    page.crmPublic
      ? publicSlotList.map((slot) => ({
          start: slot.start,
          label: formatPublicSlotLabel(slot.start),
          startAt: slot.startAt,
        }))
      : (crmSlots.length ? crmSlots : localSlots).map((item) => {
          const start = typeof item === "string" ? item : item.start;
          return {
            start,
            label: formatPublicSlotLabel(start),
            startAt: undefined as string | undefined,
          };
        })
  ).filter((item) => {
    if (!selectedDate) return false;
    if (item.startAt) return Date.parse(item.startAt) > Date.now();
    return !isPastBookingStart(
      toLocalDateStr(selectedDate),
      item.start.slice(0, 5),
      guestTz || page.timezone,
    );
  });

  const hostNames = assignedCalendarMembers(page);
  const hostName = hostNames[0] || "Host";

  useEffect(() => {
    // On a connected page, a chosen day the CRM no longer lists (its last time
    // was just taken, or the guest moved to another month) gives way to the
    // first day that still has times, instead of an empty "No times this day".
    const selectedGone =
      !!page.crmPublic &&
      !!publicDays &&
      !!selectedDate &&
      !publicDays.has(toLocalDateStr(selectedDate));
    if (selectedDate && !selectedGone) return;
    const daysInMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0,
    ).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), d);
      const dayKey = toLocalDateStr(date);
      if (isPastBookingDate(dayKey, guestTz || page.timezone)) continue;
      const hasSlots = page.crmPublic
        ? !!publicDays?.has(dayKey)
        : crmSlotDays.size
          ? crmSlotDays.has(dayKey)
          : slotsForDate(slotPage, date, slotOpts).length > 0;
      if (hasSlots) {
        setSelectedDate(date);
        if (selectedGone) setSelectedSlot(null);
        return;
      }
    }
  }, [anchor, crmSlotDays, page, publicDays, selectedDate, slotOpts, slotPage]);

  // Modern shows the chosen time in a tile, so it always holds one.
  const firstSlot = slots[0]?.start;
  useEffect(() => {
    if (!modern || !firstSlot) return;
    if (!selectedSlot || !slots.some((s) => s.start === selectedSlot)) {
      setSelectedSlot(firstSlot);
    }
  }, [modern, firstSlot, selectedSlot, slots]);

  function pickDate(d: Date) {
    const dayKey = toLocalDateStr(d);
    if (isPastBookingDate(dayKey, guestTz || page.timezone)) return;
    setSelectedDate(d);
    setSelectedSlot(null);
    setSlotNotice(null);
  }

  function showWeek(start: Date) {
    setWeekStart(start);
    setAnchor(new Date(start.getFullYear(), start.getMonth(), 1));
  }

  function changeGuestTz(tz: string) {
    setGuestTz(tz);
    setDialCode(dialCodeForTimezone(tz));
    // Times are re-read in the new zone, so the old pick no longer matches.
    if (page.crmPublic) setSelectedSlot(null);
  }

  const weekDays = Array.from(
    { length: 7 },
    (_, i) =>
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + i,
      ),
  );
  const canPrevWeek =
    toLocalDateStr(weekStart) > todayIsoInTimezone(guestTz || page.timezone);

  /** The chosen time clashed (or went stale): back to the times, freshly loaded. */
  function chooseAnotherTime(message: string) {
    setSelectedSlot(null);
    setSlotNotice(message);
    setStep("date");
    setFreshStage("time");
    setBasicStage("schedule");
    setPublicRefresh((n) => n + 1);
  }

  async function confirm() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    if (!email.trim() || !email.includes("@"))
      next.email = "Valid email required";
    if (!phone.trim()) next.phone = "Required";
    const today = toLocalDateStr(new Date());
    const submittedAnswers = { ...answers };
    if (inviteField) {
      const added = addInviteGuestEmails(inviteEmails, inviteDraft);
      if (added.error) {
        next[inviteField.id] = added.error;
      } else if (inviteField.required && !added.emails.length) {
        next[inviteField.id] = "Required";
      } else {
        setInviteEmails(added.emails);
        setInviteDraft("");
        submittedAnswers[inviteField.id] = inviteGuestEmailsLabel(added.emails);
      }
    }
    for (const q of extraGuestQuestions(page.questions)) {
      if (q.fieldType === "date" && answers[q.id] && answers[q.id] < today) {
        next[q.id] = "Choose today or a future date.";
        continue;
      }
      if (!q.required) continue;
      if (q.fieldType === "address") {
        const parts = enabledAddressParts(q);
        const missing = parts.some(
          (part) => !addressValues[q.id]?.[part.id]?.trim(),
        );
        if (missing) next[q.id] = "Required";
        continue;
      }
      if (!answers[q.id]?.trim()) next[q.id] = "Required";
    }
    if (page.termsEnabled && !acceptedTerms) {
      next.terms = "Please accept the terms and conditions.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!selectedDate || !selectedSlot) return;
    const dateStr = toLocalDateStr(selectedDate);
    // On a CRM-connected page the booking is the exact slot the CRM offered.
    const chosen = page.crmPublic
      ? publicSlotList.find((slot) => slot.start === selectedSlot)
      : undefined;
    if (
      chosen?.startAt
        ? Date.parse(chosen.startAt) <= Date.now()
        : isPastBookingStart(
            dateStr,
            selectedSlot.slice(0, 5),
            guestTz || page.timezone,
          )
    ) {
      setErrors((prev) => ({
        ...prev,
        form: "Choose today or a future date and time.",
      }));
      return;
    }
    if (page.crmPublic && !chosen) {
      chooseAnotherTime(
        "That time is no longer available. Please choose another time.",
      );
      return;
    }

    setSubmitting(true);
    setEmailError(null);
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
        startAtIso: chosen?.startAt,
        hostId: chosen?.hostId,
        timezone: guestTz,
        answers: submittedAnswers,
        rescheduleToken,
      });
      setManageToken(result.manageToken);
      setConfirmed(result.booking);
      if (result.emailError) setEmailError(result.emailError);
      setStep("done");
    } catch (error) {
      if (error instanceof PublicBookingError) {
        if (error.code === "slot_unavailable") {
          chooseAnotherTime(error.message);
        } else {
          setErrors((prev) => ({ ...prev, form: error.message }));
        }
      } else {
        setErrors((prev) => ({
          ...prev,
          form: "Could not complete this booking. Try again.",
        }));
      }
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
    ? (slots.find((s) => s.start === selectedSlot)?.label ??
      formatPublicSlotLabel(selectedSlot))
    : "";
  const timezoneGmtLabel = publicTimezoneGmt(guestTz);
  const whenLabel =
    selectedDate && selectedSlot
      ? `${confirmDateLabel} ${confirmTimeLabel}`
      : confirmed
        ? confirmed.start
        : "";

  // Every time zone, by UTC offset; the guest's and the page's are kept even
  // if this browser spells them differently.
  // Zones to list even where this browser spells them differently.
  const tzExtraZones = useMemo(
    () =>
      [
        page.timezone,
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "",
      ].filter(Boolean),
    [page.timezone],
  );

  const locationLabel = bookingLocationLabel(page);

  // Match the page's own event by slug; a name is only a fallback, since two
  // services can share one ("Test" and "Test").
  const slugMatch = (service: PublicSiteService) =>
    service.slug === page.slug ||
    service.slug === page.crmPublic?.eventTypeSlug;
  const matchedService =
    siteServices.find(slugMatch) ??
    siteServices.find((service) => service.name === page.title);
  const isThisService = (service: PublicSiteService) =>
    matchedService
      ? service.id === matchedService.id
      : service.slug === page.slug;
  const thisService: PublicSiteService = matchedService ?? {
    id: page.id,
    name: page.title,
    slug: page.slug,
    durationMinutes: page.durationMinutes,
  };
  // The link is for this event only; other services are not offered here.
  const basicServices = [thisService];

  const basicSteps = [
    {
      id: "service",
      label: "Consultation",
      icon: Briefcase,
      active: step === "date" && basicStage === "service",
      reachable: true,
      summary:
        step !== "date" || basicStage !== "service" ? (
          <>
            <span className="block text-[14px] text-slate-800">
              {page.title}
            </span>
            <span className="block text-[12px] text-slate-500">
              {formatServiceDuration(page.durationMinutes)}
            </span>
          </>
        ) : null,
      open: () => {
        setStep("date");
        setBasicStage("service");
      },
    },
    {
      id: "schedule",
      label: "Date, Time & Consultant",
      icon: Calendar,
      active: step === "date" && basicStage === "schedule",
      reachable: basicStage === "schedule" || step === "details",
      summary:
        step === "details" ? (
          <>
            <span className="block text-[14px] text-slate-800">
              {whenLabel}
            </span>
            <span className="block text-[12px] text-slate-500">
              {publicTimezoneLabel(guestTz)} · {hostNames.join(", ") || "Host"}
            </span>
          </>
        ) : null,
      open: () => {
        setStep("date");
        setBasicStage("schedule");
      },
    },
    {
      id: "info",
      label: "Your Info",
      icon: User,
      active: step === "details",
      reachable: step === "details",
      summary: null,
      open: () => setStep("details"),
    },
  ];

  // The guest form, shared by the standard and Fresh details steps.
  const guestFormFields = (
    <>
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
      {inviteField ? (
        <InviteGuestEmailsField
          label={inviteField.label}
          required={inviteField.required}
          emails={inviteEmails}
          draft={inviteDraft}
          error={errors[inviteField.id]}
          onDraftChange={(value) => {
            setInviteDraft(value);
            if (errors[inviteField.id]) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next[inviteField.id];
                return next;
              });
            }
          }}
          onAdd={(raw) => {
            const added = addInviteGuestEmails(inviteEmails, raw);
            setInviteEmails(added.emails);
            setInviteDraft(added.error ? raw.trim() : "");
            setErrors((prev) => {
              const next = { ...prev };
              if (added.error) next[inviteField.id] = added.error;
              else delete next[inviteField.id];
              return next;
            });
          }}
          onRemove={(email) =>
            setInviteEmails((prev) => prev.filter((row) => row !== email))
          }
        />
      ) : null}
      {extraGuestQuestions(page.questions).map((q) => (
        <GuestQuestion
          key={q.id}
          question={q}
          value={answers[q.id] ?? ""}
          error={errors[q.id]}
          addressValue={addressValues[q.id] ?? {}}
          onChange={(value) =>
            setAnswers((prev) => ({ ...prev, [q.id]: value }))
          }
          onAddressChange={(partId, partValue) => {
            setAddressValues((prev) => {
              const nextParts = {
                ...(prev[q.id] ?? {}),
                [partId]: partValue,
              };
              const joined = enabledAddressParts(q)
                .map((item) => nextParts[item.id]?.trim())
                .filter(Boolean)
                .join(", ");
              setAnswers((current) => ({ ...current, [q.id]: joined }));
              return { ...prev, [q.id]: nextParts };
            });
          }}
        />
      ))}
      {page.termsEnabled ? (
        <div>
          <label className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#5A32A3]"
            />
            <span
              className="[&_a]:underline [&_b]:font-bold [&_strong]:font-bold"
              onClick={(event) => {
                const anchor = (event.target as HTMLElement).closest("a");
                const href = anchor?.getAttribute("href") || "";
                if (anchor && (!href || href === "#")) event.preventDefault();
              }}
              dangerouslySetInnerHTML={{
                __html: safeTermsHtml(page.termsHtml),
              }}
            />
          </label>
          {errors.terms ? (
            <p className="mt-1 text-[12px] font-medium text-rose-600">
              {errors.terms}
            </p>
          ) : null}
        </div>
      ) : null}
      {errors.form ? (
        <p className="text-[13px] font-medium text-rose-600">{errors.form}</p>
      ) : null}
      <button
        type="button"
        onClick={confirm}
        disabled={submitting}
        className={cn(
          "mt-2 h-12 w-full rounded-lg text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-40",
          branded ? "bg-[var(--booking-brand)]" : "bg-[#5B4BDB]",
        )}
      >
        {submitting ? "Scheduling…" : "Schedule Appointment"}
      </button>
    </>
  );

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-3 py-8 sm:py-12"
      style={{
        backgroundColor: "#F3F4F6",
        ...brandingBackgroundStyle(pageBranding),
      }}
    >
      {pageBranding.header.titleVisible ||
      (pageBranding.header.logoVisible && pageBranding.header.logoUrl) ? (
        <div className="mb-4 flex w-full max-w-[980px] items-center gap-2 px-1">
          {pageBranding.header.logoVisible && pageBranding.header.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pageBranding.header.logoUrl}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          ) : null}
          {pageBranding.header.titleVisible && pageBranding.header.title ? (
            <p className="text-[16px] font-semibold text-slate-900">
              {pageBranding.header.title}
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        className="w-full max-w-[980px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
        style={{ ["--booking-brand" as string]: pageBranding.primaryColor }}
      >
        {classic && step !== "done" ? (
          <div className="space-y-4 bg-slate-50/60 p-3 sm:p-5">
            {pageBranding.showBanner ? (
              <div className="px-2 pt-2 pb-1 text-center">
                <h1 className="text-[24px] font-semibold text-slate-900 sm:text-[30px]">
                  Welcome!
                </h1>
                <p className="mx-auto mt-1 max-w-2xl text-[14px] text-slate-600">
                  Book your appointment in a few simple steps: choose a service,
                  pick your date and time, and fill in your details. See you
                  soon!
                </p>
              </div>
            ) : null}
            <section className="rounded-xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
              <button
                type="button"
                onClick={() => setServiceListOpen((open) => !open)}
                aria-expanded={serviceListOpen}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--booking-brand)] text-white">
                  <Briefcase className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] text-slate-800">
                  {page.title}
                  <span className="text-slate-400"> | </span>
                  <span className="text-[13px] text-slate-500">
                    {formatServiceDuration(page.durationMinutes)}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-[var(--booking-brand)] transition",
                    serviceListOpen && "rotate-180",
                  )}
                />
              </button>
              {serviceListOpen ? (
                <ul className="divide-y divide-slate-100 border-t border-slate-100 px-5">
                  {basicServices.map((service) => (
                    <li key={service.id}>
                      {isThisService(service) ? (
                        <button
                          type="button"
                          onClick={() => setServiceListOpen(false)}
                          className="flex w-full items-center justify-between gap-3 py-3 text-left text-[14px] font-medium text-[var(--booking-brand)]"
                        >
                          {service.name}
                          <span className="text-[12px] font-normal text-slate-500">
                            {formatServiceDuration(service.durationMinutes)}
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={`/book/${encodeURIComponent(service.slug)}`}
                          className="flex w-full items-center justify-between gap-3 py-3 text-[14px] text-slate-700 hover:text-[var(--booking-brand)]"
                        >
                          {service.name}
                          <span className="text-[12px] text-slate-500">
                            {formatServiceDuration(service.durationMinutes)}
                          </span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="rounded-xl bg-white px-5 py-5 shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--booking-brand)] text-[var(--booking-brand)]">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <h2 className="text-[17px] text-slate-800">
                    Date, Time & Consultant
                  </h2>
                </div>
                <p className="text-[14px] text-slate-600">
                  Your appointment will be booked with{" "}
                  {hostNames.join(", ") || "our team"}
                </p>
              </div>
              {rescheduleToken ? (
                <p className="mt-4 text-[12px] font-semibold text-amber-700">
                  Rescheduling your booking
                </p>
              ) : null}
              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div>
                  <div className="mb-4 flex items-center justify-center gap-8">
                    <button
                      type="button"
                      disabled={!canPrevMonth}
                      onClick={() =>
                        setAnchor(
                          new Date(
                            anchor.getFullYear(),
                            anchor.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className="rounded-md p-1 text-[var(--booking-brand)] hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <p className="min-w-[130px] text-center text-[15px] text-slate-700">
                      {anchor.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setAnchor(
                          new Date(
                            anchor.getFullYear(),
                            anchor.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="rounded-md p-1 text-[var(--booking-brand)] hover:bg-slate-50"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[11px] font-medium text-slate-500">
                    {["MO", "TU", "WE", "TH", "FR", "SA", "SU"].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7">
                    {monthDays.map((d, i) => {
                      if (!d)
                        return <span key={`e-${i}`} className="h-11 sm:h-12" />;
                      const dayKey = toLocalDateStr(d);
                      const bookable =
                        dayHasSlots(d) &&
                        !isPastBookingDate(dayKey, guestTz || page.timezone);
                      const selected =
                        !!selectedDate &&
                        d.toDateString() === selectedDate.toDateString();
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          disabled={!bookable}
                          onClick={() => pickDate(d)}
                          className="flex h-11 items-center justify-center sm:h-12"
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-[14px]",
                              selected
                                ? "bg-[var(--booking-brand)] font-semibold text-white"
                                : bookable
                                  ? "font-semibold text-slate-800 hover:bg-slate-100"
                                  : dayKey === todayKey
                                    ? "text-[var(--booking-brand)]"
                                    : "text-slate-400",
                            )}
                          >
                            {d.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-slate-800">
                    Slot Availability
                  </h3>
                  <TimeZonePicker
                    value={guestTz}
                    onChange={changeGuestTz}
                    extraZones={tzExtraZones}
                    className="mt-3 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none focus:border-[var(--booking-brand)]"
                  />
                  {slotNotice ? (
                    <p
                      role="alert"
                      className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
                    >
                      {slotNotice}
                    </p>
                  ) : null}
                  {publicError ? (
                    <div role="alert" className="mt-6 text-center">
                      <p className="text-[12px] leading-5 text-slate-500">
                        {publicError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPublicRefresh((n) => n + 1)}
                        className="mt-3 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-700 hover:border-[var(--booking-brand)]"
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}
                  {publicLoading ? (
                    <p className="py-10 text-center text-[12px] text-slate-400">
                      Loading times…
                    </p>
                  ) : null}
                  {!publicLoading && !publicError && slots.length === 0 ? (
                    <p className="py-10 text-center text-[12px] text-slate-400">
                      {selectedDate
                        ? "No times this day"
                        : "Pick a date to see times"}
                    </p>
                  ) : null}
                  {slotPeriods(slots).map((period) => (
                    <div key={period.label} className="mt-6">
                      <div className="flex items-center gap-3 text-[13px] text-slate-500">
                        <span className="h-px flex-1 bg-slate-200" />
                        {period.label}
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {period.slots.map((s) => (
                          <button
                            key={s.start}
                            type="button"
                            onClick={() => {
                              setSlotNotice(null);
                              setSelectedSlot(s.start);
                              setStep("details");
                            }}
                            className={cn(
                              "h-11 rounded-md border border-[var(--booking-brand)] text-[13px] font-medium transition",
                              step === "details" && selectedSlot === s.start
                                ? "bg-[var(--booking-brand)] text-white"
                                : "text-[var(--booking-brand)] hover:bg-[var(--booking-brand)] hover:text-white",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {step === "details" ? (
              <section
                ref={(node) =>
                  node?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-xl bg-white px-5 py-5 shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 sm:px-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--booking-brand)] text-[var(--booking-brand)]">
                      <User className="h-5 w-5" />
                    </span>
                    <h2 className="text-[17px] text-slate-800">Your Info</h2>
                  </div>
                  <p className="text-[14px] text-slate-600">
                    {whenLabel} · {publicTimezoneLabel(guestTz)}
                  </p>
                </div>
                <div className="mx-auto mt-6 max-w-[460px] space-y-4">
                  {guestFormFields}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {modern && step !== "done" ? (
          <div className="px-5 py-8 sm:px-10 sm:py-12">
            {pageBranding.showBanner ? (
              <div className="mb-10">
                <h1 className="text-[30px] font-semibold text-[var(--booking-brand)] sm:text-[40px]">
                  Welcome!
                </h1>
                <p className="mt-2 max-w-3xl text-[15px] text-slate-700">
                  Book your appointment in a few simple steps: choose a service,
                  pick your date and time, and fill in your details. See you
                  soon!
                </p>
              </div>
            ) : null}
            {rescheduleToken ? (
              <p className="mb-4 text-[12px] font-semibold text-amber-700">
                Rescheduling your booking
              </p>
            ) : null}
            {slotNotice ? (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
              >
                {slotNotice}
              </p>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              <ModernTile icon={Briefcase}>
                <span className="block text-[15px] font-medium text-slate-800">
                  {page.title}
                </span>
                <span className="block text-[13px] text-slate-500">
                  ( {formatServiceDuration(page.durationMinutes)} )
                </span>
              </ModernTile>
              <ModernTile icon={Users}>
                <span className="block text-[15px] font-medium text-slate-800">
                  {hostNames.join(", ") || "Host"}
                </span>
              </ModernTile>
              <ModernTile icon={Calendar} label="Date">
                <select
                  aria-label="Date"
                  value={selectedDate ? toLocalDateStr(selectedDate) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "next" || value === "prev") {
                      setAnchor(
                        new Date(
                          anchor.getFullYear(),
                          anchor.getMonth() + (value === "next" ? 1 : -1),
                          1,
                        ),
                      );
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      return;
                    }
                    const [y, m, d] = value.split("-").map(Number);
                    pickDate(new Date(y, m - 1, d));
                  }}
                  className="fc-select-caret w-full cursor-pointer appearance-none truncate bg-transparent p-0 text-[15px] font-medium text-slate-800 outline-none"
                >
                  {!selectedDate ? (
                    <option value="">Choose a date</option>
                  ) : null}
                  {canPrevMonth ? (
                    <option value="prev">‹ Earlier dates</option>
                  ) : null}
                  {monthDays
                    .filter(
                      (d): d is Date =>
                        !!d &&
                        dayHasSlots(d) &&
                        !isPastBookingDate(
                          toLocalDateStr(d),
                          guestTz || page.timezone,
                        ),
                    )
                    .map((d) => (
                      <option key={toLocalDateStr(d)} value={toLocalDateStr(d)}>
                        {d.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </option>
                    ))}
                  <option value="next">Later dates ›</option>
                </select>
              </ModernTile>
              <ModernTile icon={Globe} label="Time zone">
                <TimeZonePicker
                  value={guestTz}
                  onChange={changeGuestTz}
                  extraZones={tzExtraZones}
                  className="h-auto border-0 bg-transparent p-0 text-[15px] font-medium text-slate-800 focus:border-0"
                  hideChevron
                />
              </ModernTile>
              <ModernTile icon={Clock} label="Time">
                {slots.length ? (
                  <select
                    aria-label="Time"
                    value={selectedSlot ?? ""}
                    onChange={(e) => {
                      setSlotNotice(null);
                      setSelectedSlot(e.target.value);
                    }}
                    className="fc-select-caret w-full cursor-pointer appearance-none truncate bg-transparent p-0 text-[15px] font-medium text-slate-800 outline-none"
                  >
                    {slots.map((s) => (
                      <option key={s.start} value={s.start}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[14px] text-slate-400">
                    {publicLoading
                      ? "Loading times…"
                      : (publicError ?? "No times this day")}
                  </span>
                )}
              </ModernTile>
              <button
                type="button"
                disabled={!selectedDate || !selectedSlot || !slots.length}
                onClick={() => setStep("details")}
                className="min-h-[88px] rounded-md bg-[var(--booking-brand)] px-6 text-[17px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {pageBranding.buttonText.trim() || "Book Appointment"}
              </button>
            </div>
          </div>
        ) : null}

        {modern && step === "details" ? (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Booking Summary"
          >
            <button
              type="button"
              aria-label="Close booking summary"
              onClick={() => setStep("date")}
              className="absolute inset-0 bg-slate-900/25"
            />
            <aside className="relative flex h-full w-full max-w-[520px] flex-col bg-slate-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <h2 className="text-[18px] text-slate-800">Booking Summary</h2>
                <button
                  type="button"
                  onClick={() => setStep("date")}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center gap-4 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-[var(--booking-brand)] text-[22px] text-white">
                    {page.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] text-slate-800">
                      {page.title}
                    </span>
                    <span className="block text-[12px] text-slate-500">
                      ( {formatServiceDuration(page.durationMinutes)} |{" "}
                      {page.eventType} )
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-white p-4 text-[14px] text-slate-700 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--booking-brand)]" />
                    {whenLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[var(--booking-brand)]" />
                    {publicTimezoneLabel(guestTz)}
                  </span>
                </div>
                <div className="bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-6">
                  <h3 className="mb-5 text-[16px] text-slate-800">
                    Please enter your details
                  </h3>
                  <div className="space-y-4">{guestFormFields}</div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {basic && step !== "done" ? (
          <div>
            {pageBranding.showBanner ? (
              <div className="border-b border-slate-100 px-5 py-8 text-center sm:px-10">
                <h1 className="text-[26px] font-semibold text-slate-900 sm:text-[34px]">
                  Welcome!
                </h1>
                <p className="mx-auto mt-2 max-w-2xl text-[14px] text-slate-600">
                  Book your appointment in a few simple steps: choose a service,
                  pick your date and time, and fill in your details. See you
                  soon!
                </p>
              </div>
            ) : null}
            <div className="grid md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <nav
                aria-label="Booking steps"
                className="border-b border-slate-100 p-3 md:border-r md:border-b-0"
              >
                {basicSteps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!item.reachable}
                      onClick={item.open}
                      aria-current={item.active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-4 py-4 text-left transition disabled:cursor-default",
                        item.active
                          ? "bg-slate-50"
                          : item.reachable && "hover:bg-slate-50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          item.active
                            ? "text-[var(--booking-brand)]"
                            : "text-slate-400",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        {item.summary ?? (
                          <span
                            className={cn(
                              "text-[14px]",
                              item.active
                                ? "font-medium text-[var(--booking-brand)]"
                                : "text-slate-500",
                            )}
                          >
                            {item.label}
                          </span>
                        )}
                      </span>
                      {item.active || item.summary ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : null}
                    </button>
                  );
                })}
              </nav>

              <section className="min-w-0 px-5 py-6 sm:px-8">
                {rescheduleToken ? (
                  <p className="mb-4 text-[12px] font-semibold text-amber-700">
                    Rescheduling your booking
                  </p>
                ) : null}

                {step === "date" && basicStage === "service" ? (
                  <ul className="divide-y divide-slate-100">
                    {basicServices.map((service) => {
                      const row = (
                        <>
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--booking-brand)_12%,white)] text-[18px] text-[var(--booking-brand)]">
                            {service.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[16px] text-slate-800">
                            {service.name}
                          </span>
                          <span className="shrink-0 text-[13px] text-slate-500">
                            {formatServiceDuration(service.durationMinutes)}
                          </span>
                        </>
                      );
                      const rowClass =
                        "flex w-full items-center gap-4 rounded-lg px-2 py-4 text-left transition hover:bg-slate-50";
                      return (
                        <li key={service.id}>
                          {isThisService(service) ? (
                            <button
                              type="button"
                              onClick={() => setBasicStage("schedule")}
                              className={rowClass}
                            >
                              {row}
                            </button>
                          ) : (
                            <Link
                              href={`/book/${encodeURIComponent(service.slug)}`}
                              className={rowClass}
                            >
                              {row}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {step === "date" && basicStage === "schedule" ? (
                  <div>
                    <p className="border-b border-slate-100 pb-4 text-[14px] text-slate-700">
                      Your appointment will be booked with{" "}
                      {hostNames.join(", ") || "our team"}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[17px] text-slate-800">
                        {weekStart.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <TimeZonePicker
                        value={guestTz}
                        onChange={changeGuestTz}
                        extraZones={tzExtraZones}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[var(--booking-brand)] sm:w-[260px]"
                      />
                    </div>
                    <div className="mt-5 flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        disabled={!canPrevWeek}
                        onClick={() =>
                          showWeek(
                            new Date(
                              weekStart.getFullYear(),
                              weekStart.getMonth(),
                              weekStart.getDate() - 7,
                            ),
                          )
                        }
                        className="shrink-0 rounded-md p-1 text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
                        aria-label="Previous week"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2">
                        {weekDays.map((d) => {
                          const bookable =
                            dayHasSlots(d) &&
                            !isPastBookingDate(
                              toLocalDateStr(d),
                              guestTz || page.timezone,
                            );
                          const selected =
                            bookable &&
                            !!selectedDate &&
                            d.toDateString() === selectedDate.toDateString();
                          return (
                            <button
                              key={d.toISOString()}
                              type="button"
                              disabled={!bookable}
                              onClick={() => pickDate(d)}
                              aria-label={d.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}
                              className={cn(
                                "flex h-14 flex-col items-center justify-center rounded-md leading-tight shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 transition sm:h-[72px]",
                                selected
                                  ? "bg-[var(--booking-brand)] text-white ring-[var(--booking-brand)]"
                                  : bookable
                                    ? "bg-white text-slate-800 ring-slate-100 hover:ring-[var(--booking-brand)]"
                                    : "bg-white text-slate-300 ring-slate-100",
                              )}
                            >
                              <span className="text-[15px] sm:text-[19px]">
                                {d.getDate()}
                              </span>
                              <span className="text-[9px] uppercase sm:text-[12px]">
                                {d.toLocaleDateString("en-US", {
                                  weekday: "short",
                                })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          showWeek(
                            new Date(
                              weekStart.getFullYear(),
                              weekStart.getMonth(),
                              weekStart.getDate() + 7,
                            ),
                          )
                        }
                        className="shrink-0 rounded-md p-1 text-slate-600 hover:bg-slate-50"
                        aria-label="Next week"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                    {slotNotice ? (
                      <p
                        role="alert"
                        className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
                      >
                        {slotNotice}
                      </p>
                    ) : null}
                    {publicError ? (
                      <div role="alert" className="mt-6 text-center">
                        <p className="text-[12px] leading-5 text-slate-500">
                          {publicError}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPublicRefresh((n) => n + 1)}
                          className="mt-3 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-700 hover:border-[var(--booking-brand)]"
                        >
                          Try again
                        </button>
                      </div>
                    ) : null}
                    {publicLoading ? (
                      <p className="py-10 text-center text-[12px] text-slate-400">
                        Loading times…
                      </p>
                    ) : null}
                    {!publicLoading && !publicError && slots.length === 0 ? (
                      <p className="py-10 text-center text-[12px] text-slate-400">
                        {selectedDate
                          ? "No times this day"
                          : "Pick a day to see times"}
                      </p>
                    ) : null}
                    {slotPeriods(slots).map((period) => (
                      <div key={period.label} className="mt-7">
                        <div className="flex items-center gap-3 text-[13px] text-slate-500">
                          <span className="h-px flex-1 bg-slate-200" />
                          {period.label}
                          <span className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {period.slots.map((s) => (
                            <button
                              key={s.start}
                              type="button"
                              onClick={() => {
                                setSlotNotice(null);
                                setSelectedSlot(s.start);
                                setStep("details");
                              }}
                              className="h-11 rounded-md border border-[var(--booking-brand)] text-[13px] font-medium text-[var(--booking-brand)] transition hover:bg-[var(--booking-brand)] hover:text-white"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {step === "details" ? (
                  <div>
                    <h2 className="text-center text-[18px] font-semibold text-slate-900">
                      Please enter your details
                    </h2>
                    <div className="mx-auto mt-8 max-w-[420px] space-y-4">
                      {guestFormFields}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}

        {step === "date" && fresh && freshStage === "day" ? (
          <div className="px-5 py-6 sm:px-10 sm:py-8">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[18px] text-slate-800 sm:text-[20px]">
                  {hostNames.join(", ") || page.title}
                </p>
                <p className="text-[13px] text-slate-500">
                  {page.title} · {page.durationMinutes} mins
                </p>
              </div>
            </div>
            {rescheduleToken ? (
              <p className="mt-2 text-[12px] font-semibold text-amber-700">
                Rescheduling your booking
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
              <label htmlFor="fresh-tz" className="text-[14px] text-slate-600">
                Choose Timezone
              </label>
              <TimeZonePicker
                value={guestTz}
                onChange={changeGuestTz}
                extraZones={tzExtraZones}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none focus:border-[var(--booking-brand)] sm:w-[280px]"
                id="fresh-tz"
              />
            </div>
            <h2 className="mt-10 text-center text-[17px] text-slate-700">
              Select a Day
            </h2>
            <div className="mt-6 flex items-center justify-center gap-1 sm:gap-3">
              <button
                type="button"
                disabled={!canPrevWeek}
                onClick={() =>
                  showWeek(
                    new Date(
                      weekStart.getFullYear(),
                      weekStart.getMonth(),
                      weekStart.getDate() - 7,
                    ),
                  )
                }
                className="shrink-0 rounded-md p-1 text-[var(--booking-brand)] hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="grid min-w-0 max-w-[640px] flex-1 grid-cols-7 gap-1.5 sm:gap-4">
                {weekDays.map((d) => {
                  const bookable =
                    dayHasSlots(d) &&
                    !isPastBookingDate(
                      toLocalDateStr(d),
                      guestTz || page.timezone,
                    );
                  const selected =
                    bookable &&
                    !!selectedDate &&
                    d.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!bookable}
                      onClick={() => {
                        pickDate(d);
                        setFreshStage("time");
                      }}
                      aria-label={d.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                      className={cn(
                        "mx-auto flex aspect-square w-full max-w-[84px] flex-col items-center justify-center rounded-full border-2 leading-tight transition",
                        selected
                          ? "border-[var(--booking-brand)] bg-[var(--booking-brand)] text-white"
                          : bookable
                            ? "border-[var(--booking-brand)] text-slate-700 hover:bg-[var(--booking-brand)] hover:text-white"
                            : "border-slate-200 text-slate-300",
                      )}
                    >
                      <span className="hidden text-[12px] sm:block">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-[15px] font-medium sm:text-[22px]">
                        {d.getDate()}
                      </span>
                      <span className="text-[9px] uppercase sm:text-[11px]">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  showWeek(
                    new Date(
                      weekStart.getFullYear(),
                      weekStart.getMonth(),
                      weekStart.getDate() + 7,
                    ),
                  )
                }
                className="shrink-0 rounded-md p-1 text-[var(--booking-brand)] hover:bg-slate-50"
                aria-label="Next week"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            {publicLoading ? (
              <p className="mt-6 text-center text-[12px] text-slate-400">
                Loading days…
              </p>
            ) : null}
            {publicError ? (
              <div role="alert" className="mt-6 text-center">
                <p className="text-[12px] leading-5 text-slate-500">
                  {publicError}
                </p>
                <button
                  type="button"
                  onClick={() => setPublicRefresh((n) => n + 1)}
                  className="mt-3 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-700 hover:border-[var(--booking-brand)]"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "date" && fresh && freshStage === "time" ? (
          <div className="px-5 py-6 sm:px-10 sm:py-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setFreshStage("day")}
                className="flex items-start gap-2 text-left"
                aria-label="Back to days"
              >
                <ChevronLeft className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" />
                <span>
                  <span className="block text-[17px] text-slate-700">
                    {selectedDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                  </span>
                  <span className="block text-[13px] text-slate-500">
                    {selectedDate?.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </button>
              <p className="text-[13px] text-slate-500">
                Times are in {publicTimezoneLabel(guestTz)}
              </p>
            </div>
            <div className="mx-auto mt-8 max-w-[500px]">
              <h2 className="text-[18px] text-slate-700">Select a Time</h2>
              {slotNotice ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
                >
                  {slotNotice}
                </p>
              ) : null}
              {publicLoading ? (
                <p className="py-10 text-center text-[12px] text-slate-400">
                  Loading times…
                </p>
              ) : null}
              {!publicLoading && slots.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-slate-400">
                  No times this day. Go back and pick another day.
                </p>
              ) : null}
              {slotPeriods(slots).map((period) => (
                <div key={period.label} className="mt-6">
                  <div className="flex items-center gap-3 text-[13px] text-slate-500">
                    <span className="h-px flex-1 bg-slate-200" />
                    {period.label}
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {period.slots.map((s) => (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() => {
                          setSlotNotice(null);
                          setSelectedSlot(s.start);
                          setStep("details");
                        }}
                        className="h-12 w-full rounded-md border border-[var(--booking-brand)] text-[14px] font-medium text-[var(--booking-brand)] transition hover:bg-[var(--booking-brand)] hover:text-white"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === "date" && !branded ? (
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
              <div className="mt-4">
                <AssignedHosts names={hostNames} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                {page.durationMinutes} mins
              </div>
              {page.description ? (
                <div
                  className="fc-rich-editor mt-4 text-[12px] leading-5 text-slate-500 [&_a]:text-[#5A32A3] [&_a]:underline [&_p]:m-0"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeDescriptionHtml(page.description),
                  }}
                />
              ) : null}
            </aside>

            <section className="border-b border-slate-100 px-6 py-6 lg:border-r lg:border-b-0">
              <h2 className="mb-5 text-[17px] font-semibold text-slate-900">
                Select date and time
              </h2>
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  disabled={!canPrevMonth}
                  onClick={() =>
                    setAnchor(
                      new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
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
                  const hasSlots = dayHasSlots(d);
                  const isPast = isPastBookingDate(
                    dayKey,
                    guestTz || page.timezone,
                  );
                  const bookable = hasSlots && !isPast;
                  const selected =
                    selectedDate &&
                    d.toDateString() === selectedDate.toDateString();
                  const isToday = dayKey === todayKey;
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!bookable}
                      onClick={() => pickDate(d)}
                      className="relative flex h-11 items-center justify-center"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium",
                          selected
                            ? "bg-[#5B4BDB] text-white"
                            : bookable
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
              <TimeZonePicker
                value={guestTz}
                onChange={(zone) => {
                  setGuestTz(zone);
                  setDialCode(dialCodeForTimezone(zone));
                }}
                extraZones={tzExtraZones}
                className="h-auto border-0 bg-transparent p-0 text-[15px] font-medium text-slate-800 focus:border-0"
                hideChevron
              />
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
                {slotNotice ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
                  >
                    {slotNotice}
                  </p>
                ) : null}
                {publicError ? (
                  <div role="alert" className="py-8 text-center">
                    <p className="text-[12px] leading-5 text-slate-500">
                      {publicError}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPublicRefresh((n) => n + 1)}
                      className="mt-3 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-700 hover:border-[#5B4BDB]/50"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}
                {publicLoading ? (
                  <p className="py-10 text-center text-[12px] text-slate-400">
                    Loading times…
                  </p>
                ) : null}
                {!selectedDate && !publicLoading && !publicError ? (
                  <p className="py-10 text-center text-[12px] text-slate-400">
                    Pick a date to see times
                  </p>
                ) : null}
                {selectedDate &&
                slots.length === 0 &&
                !publicLoading &&
                !publicError ? (
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
                      onClick={() => {
                        setSlotNotice(null);
                        setSelectedSlot(s.start);
                      }}
                      className="h-11 w-full rounded-full border border-slate-200 text-[13px] font-medium text-slate-700 hover:border-[#5B4BDB]/50"
                    >
                      {s.label}
                    </button>
                  ),
                )}
              </div>
            </section>
          </div>
        ) : null}

        {step === "details" && fresh ? (
          <div className="px-5 py-6 sm:px-10 sm:py-8">
            <button
              type="button"
              onClick={() => {
                setStep("date");
                setFreshStage("time");
              }}
              className="flex items-center gap-2 text-[18px] text-slate-700"
            >
              <ChevronLeft className="h-6 w-6 text-slate-500" />
              Enter Details
            </button>
            <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-12">
              <div className="space-y-5 text-[15px] text-slate-700">
                <p className="flex items-center gap-3 font-semibold">
                  <Calendar className="h-5 w-5 shrink-0 text-slate-400" />
                  {page.title}
                </p>
                <p className="flex items-center gap-3">
                  <Users className="h-5 w-5 shrink-0 text-slate-400" />
                  {hostNames.join(", ") || "Host"}
                </p>
                <p className="flex items-center gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-slate-400" />
                  {whenLabel}
                </p>
                <p className="flex items-center gap-3">
                  <Globe className="h-5 w-5 shrink-0 text-slate-400" />
                  {publicTimezoneLabel(guestTz)}
                </p>
              </div>
              <div className="space-y-4">{guestFormFields}</div>
            </div>
          </div>
        ) : null}

        {step === "details" && !branded ? (
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
                <AssignedHosts names={hostNames} />
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
              <div className="max-w-[420px] space-y-4">{guestFormFields}</div>
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
                  <p className="mt-1 text-[14px] text-slate-700">
                    {page.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {guestTz} {timezoneGmtLabel}
                  </p>
                  {confirmed.joinUrl ? (
                    <p className="mt-3 text-[13px]">
                      <a
                        href={confirmed.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#5B4BDB] hover:underline break-all"
                      >
                        Join meeting
                      </a>
                    </p>
                  ) : null}
                  <p className="mt-5 text-[13px]">
                    <a
                      href={googleCalendarUrl({
                        title: page.title,
                        details: [
                          page.description,
                          confirmed.joinUrl
                            ? `Join meeting: ${confirmed.joinUrl}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join("\n"),
                        location: confirmed.joinUrl || locationLabel,
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
                            description: [
                              page.description,
                              confirmed.joinUrl
                                ? `Join meeting: ${confirmed.joinUrl}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join("\n"),
                            location: confirmed.joinUrl || locationLabel,
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
            {emailError ? (
              <p className="mt-4 max-w-[520px] text-center text-[13px] text-amber-700">
                Your appointment is booked, but the confirmation email could not
                be sent. Save the details above or add them to your calendar.
              </p>
            ) : confirmed.joinUrl ? (
              <p className="mt-4 max-w-[520px] text-center text-[13px] text-slate-500">
                A confirmation email with the meeting link was sent to{" "}
                <span className="font-medium text-slate-700">
                  {confirmed.guestEmail}
                </span>
                .
              </p>
            ) : null}
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
      <PublicBrandFooter branding={pageBranding} />
    </div>
  );
}

/** One Modern tile: an icon cell beside its content (text or a select). */
function ModernTile({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[88px] items-stretch bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
      <span className="flex w-16 shrink-0 items-center justify-center border-r border-slate-100 text-[var(--booking-brand)] xl:w-20">
        <Icon className="h-6 w-6" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <div className="min-w-0 flex-1">{children}</div>
        {label ? (
          <ChevronsUpDown
            className="h-4 w-4 shrink-0 text-[var(--booking-brand)]"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

/** "30 mins", "1 hr", "1 hr 30 mins". */
function formatServiceDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours} hr ${mins} mins`;
  if (hours) return `${hours} hr`;
  return `${mins} mins`;
}

/** Splits a day's times into Morning / Afternoon / Evening by their HH:mm start. */
function slotPeriods<T extends { start: string }>(slots: T[]) {
  const periods = [
    { label: "Morning", slots: [] as T[] },
    { label: "Afternoon", slots: [] as T[] },
    { label: "Evening", slots: [] as T[] },
  ];
  for (const slot of slots) {
    const hour = Number(slot.start.slice(0, 2));
    periods[hour < 12 ? 0 : hour < 17 ? 1 : 2].slots.push(slot);
  }
  return periods.filter((period) => period.slots.length);
}

function PublicBrandFooter({ branding }: { branding: BookingPageBranding }) {
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
    <div className="mt-4 flex w-full max-w-[980px] flex-wrap gap-x-4 gap-y-1 px-1 text-[12px] text-slate-500">
      {items.map((item) => (
        <span key={String(item)}>{item}</span>
      ))}
    </div>
  );
}

function formatPublicSlotLabel(hhmm: string) {
  return formatWorkingHoursClock(hhmm);
}

function publicTimezoneGmt(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
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

/** "UTC+11:00 · Australia/Sydney": the offset first, so it survives truncation. */
function publicTimezoneLabel(tz: string) {
  return timezoneOptionLabel(tz);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  required = false,
  inputMode,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric" | "text";
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <input
        type={type}
        inputMode={inputMode}
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
      {hint ? (
        <p className="mt-1 text-[12px] italic text-slate-500">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

function InviteGuestEmailsField({
  label,
  required,
  emails,
  draft,
  error,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  label: string;
  required?: boolean;
  emails: string[];
  draft: string;
  error?: string;
  onDraftChange: (value: string) => void;
  onAdd: (raw: string) => void;
  onRemove: (email: string) => void;
}) {
  const full = emails.length >= MAX_INVITE_GUEST_EMAILS;
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <div
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5",
          error
            ? "border-rose-300"
            : "border-slate-200 hover:border-violet-300 focus-within:border-[#5B4BDB] focus-within:shadow-[0_0_0_3px_rgba(91,75,219,0.12)]",
        )}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2 text-[12px] text-slate-700"
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              onClick={() => onRemove(email)}
              className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={draft}
          disabled={full}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === "," ||
              event.key === "Tab"
            ) {
              if (!draft.trim()) return;
              event.preventDefault();
              onAdd(draft);
            }
            if (event.key === "Backspace" && !draft && emails.length) {
              onRemove(emails[emails.length - 1]!);
            }
          }}
          onBlur={() => {
            if (draft.trim()) onAdd(draft);
          }}
          placeholder={
            emails.length
              ? full
                ? "Maximum 10 emails"
                : "Add another email"
              : "Guest email"
          }
          className="h-8 min-w-[140px] flex-1 border-0 bg-transparent px-1 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 disabled:placeholder:text-slate-300"
        />
      </div>
      <p className="mt-1 text-[12px] text-slate-400">
        Add up to {MAX_INVITE_GUEST_EMAILS} email addresses
      </p>
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

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
  const [query, setQuery] = useState("");
  // Codes are shared (+1 is the US, Canada and more), so remember the country.
  const [iso, setIso] = useState(
    () => phoneCountryForCode(dialCode)?.iso ?? "",
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The menu is portalled to <body> with fixed coordinates: the booking card
  // clips its overflow and some layouts scroll the form, either of which
  // hid the search box and list when the menu sat inside them.
  const [menuAt, setMenuAt] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const chosen = phoneCountryByIso(iso);
  const selected =
    (chosen?.code === dialCode ? chosen : phoneCountryForCode(dialCode)) ??
    PHONE_COUNTRIES[0];
  const matches = useMemo(() => searchPhoneCountries(query), [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setMenuAt(null);
  }

  function placeMenu() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 4;
    const below = window.innerHeight - rect.bottom - gap - 8;
    const above = rect.top - gap - 8;
    const width = Math.min(rect.width, 384);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    // Open downwards unless there is clearly more room above.
    if (below >= 240 || below >= above) {
      setMenuAt({
        left,
        width,
        top: rect.bottom + gap,
        maxHeight: Math.max(160, below),
      });
    } else {
      setMenuAt({
        left,
        width,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(160, above),
      });
    }
  }

  function openMenu() {
    placeMenu();
    setOpen(true);
  }

  function pick(row: PhoneCountry) {
    setIso(row.iso);
    onDialCodeChange(row.code);
    close();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      setMenuAt(null);
    }
    // Keep the menu on its field while the page or the form scrolls; a scroll
    // inside the menu's own list is not a reason to move it.
    function onMove(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        setQuery("");
        setMenuAt(null);
        return;
      }
      placeMenu();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

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
          onClick={() => (open ? close() : openMenu())}
          className="flex h-full shrink-0 items-center gap-1.5 px-3 text-[13px] font-medium text-slate-700"
          aria-label={`Country code: ${selected.name} ${selected.code}`}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span aria-hidden className="text-[15px] leading-none">
            {selected.flag}
          </span>
          <span className="tabular-nums">{selected.iso}</span>
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
          inputMode="tel"
          autoComplete="tel-national"
          className="h-full min-w-0 flex-1 border-0 bg-transparent pr-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
      {open && menuAt && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: menuAt.left,
                width: menuAt.width,
                top: menuAt.top,
                bottom: menuAt.bottom,
                maxHeight: menuAt.maxHeight,
              }}
              className="z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      close();
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      if (matches[0]) pick(matches[0]);
                    }
                  }}
                  placeholder="Search country or code"
                  aria-label="Search country or code"
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-3 pl-8 text-[13px] text-slate-800 outline-none focus:border-slate-300"
                />
              </div>
              <ul
                role="listbox"
                aria-label="Countries"
                className="max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
              >
                {matches.map((row) => (
                  <li
                    key={row.iso}
                    role="option"
                    aria-selected={row.iso === selected.iso}
                  >
                    <button
                      type="button"
                      onClick={() => pick(row)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                        row.iso === selected.iso
                          ? "bg-slate-50 font-medium text-slate-900"
                          : "text-slate-700",
                      )}
                    >
                      <span aria-hidden className="text-[15px] leading-none">
                        {row.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {row.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {row.code}
                      </span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 ? (
                  <li className="px-3 py-4 text-[12px] text-slate-400">
                    No country matches “{query}”
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

function safeTermsHtml(html: string | undefined) {
  const source = (html || "").trim();
  if (!source) return "I have read and agree to your terms and conditions.";
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function extraGuestQuestions<
  T extends { id: string; label: string; required?: boolean; hidden?: boolean },
>(questions: T[]) {
  return questions.filter((question) => {
    if (question.hidden || isInviteGuestsQuestion(question)) return false;
    const id = question.id.trim().toLowerCase();
    return !["name", "email", "phone", "contact"].includes(id);
  });
}

function enabledAddressParts(question: {
  addressParts?: { id: string; label: string; enabled: boolean }[];
}) {
  const parts = (question.addressParts ?? []).filter((part) => part.enabled);
  return parts.length
    ? parts
    : [{ id: "line1", label: "Address Line 1", enabled: true }];
}

function GuestQuestion({
  question,
  value,
  error,
  addressValue,
  onChange,
  onAddressChange,
}: {
  question: {
    id: string;
    label: string;
    required?: boolean;
    fieldType?: string;
    options?: string[];
    addressParts?: { id: string; label: string; enabled: boolean }[];
  };
  value: string;
  error?: string;
  addressValue: Record<string, string>;
  onChange: (value: string) => void;
  onAddressChange: (partId: string, value: string) => void;
}) {
  const label = (
    <span className="mb-1.5 block text-[13px] font-medium text-slate-800">
      {question.label}
      {question.required ? <span className="text-rose-500"> *</span> : null}
    </span>
  );
  const inputClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 hover:border-violet-300 focus:border-[#5B4BDB] focus:shadow-[0_0_0_3px_rgba(91,75,219,0.12)]";

  if (
    question.fieldType === "dropdown" &&
    question.options?.some((option) => option.trim())
  ) {
    return (
      <label className="block">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select</option>
          {question.options
            .filter((option) => option.trim())
            .map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
        {error ? <FieldError message={error} /> : null}
      </label>
    );
  }

  if (
    question.fieldType === "radio" &&
    question.options?.some((option) => option.trim())
  ) {
    return (
      <div>
        {label}
        <div className="space-y-2">
          {question.options
            .filter((option) => option.trim())
            .map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 text-[13px] text-slate-700"
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="h-4 w-4"
                />
                {option}
              </label>
            ))}
        </div>
        {error ? <FieldError message={error} /> : null}
      </div>
    );
  }

  if (question.fieldType === "checkbox") {
    const options = question.options?.filter(Boolean) ?? [];
    if (options.length) {
      const selected = new Set(
        value
          .split(", ")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      return (
        <div>
          {label}
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 text-[13px] text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selected.has(option)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(option)) next.delete(option);
                    else next.add(option);
                    onChange([...next].join(", "));
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {option}
              </label>
            ))}
          </div>
          {error ? <FieldError message={error} /> : null}
        </div>
      );
    }
    return (
      <label className="flex items-center gap-2 text-[13px] text-slate-800">
        <input
          type="checkbox"
          checked={value === "yes"}
          onChange={(e) => onChange(e.target.checked ? "yes" : "")}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span>
          {question.label}
          {question.required ? <span className="text-rose-500"> *</span> : null}
        </span>
      </label>
    );
  }

  if (question.fieldType === "address") {
    return (
      <div className="space-y-2">
        {label}
        {enabledAddressParts(question).map((part) => (
          <input
            key={part.id}
            value={addressValue[part.id] ?? ""}
            placeholder={part.label}
            onChange={(e) => onAddressChange(part.id, e.target.value)}
            className={inputClass}
          />
        ))}
        {error ? <FieldError message={error} /> : null}
      </div>
    );
  }

  if (question.fieldType === "date") {
    return (
      <div>
        {label}
        <div className="relative">
          <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            min={toLocalDateStr(new Date())}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (next && next < toLocalDateStr(new Date())) return;
              onChange(next);
            }}
            className={cn(
              inputClass,
              "pr-3 pl-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
              !value && "text-transparent",
            )}
          />
          {!value ? (
            <span className="pointer-events-none absolute top-1/2 left-10 -translate-y-1/2 text-[13px] text-slate-400">
              Select Date
            </span>
          ) : null}
        </div>
        {error ? <FieldError message={error} /> : null}
      </div>
    );
  }

  if (question.fieldType === "multiline") {
    return (
      <label className="block">
        {label}
        <textarea
          value={value}
          rows={3}
          placeholder={question.label}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 hover:border-violet-300 focus:border-[#5B4BDB] focus:shadow-[0_0_0_3px_rgba(91,75,219,0.12)]"
        />
        {error ? <FieldError message={error} /> : null}
      </label>
    );
  }

  return (
    <Field
      label={question.label}
      required={question.required}
      error={error}
      value={value}
      onChange={(next) =>
        onChange(
          question.fieldType === "number"
            ? next.replace(/\D/g, "").slice(0, 9)
            : next,
        )
      }
      placeholder={question.fieldType === "number" ? undefined : question.label}
      type={question.fieldType === "email" ? "email" : "text"}
      inputMode={question.fieldType === "number" ? "numeric" : undefined}
      hint={
        question.fieldType === "number"
          ? "This field allows numeric input only, with a maximum limit of 9 digits."
          : undefined
      }
    />
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 text-[12px] font-medium text-rose-600">{message}</p>
  );
}

/** `YYYY-MM-DD` moved by whole days. */
function shiftIsoDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + days));
  return at.toISOString().slice(0, 10);
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
