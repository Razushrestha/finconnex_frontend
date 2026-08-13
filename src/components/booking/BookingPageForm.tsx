"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CalendarClock,
  Clock,
  MapPin,
  Video,
  MessageSquare,
  Mail,
  Bell,
  Link2,
  User,
  Plus,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  Phone,
  Users,
  Building2,
  Sparkles,
  Globe,
  DollarSign,
} from "lucide-react";
import {
  BOOKING_EVENT_TYPES,
  WEEKDAYS,
  consultationModeLabel,
  formatBookingPrice,
  getBookingPageById,
  meetingModeLabel,
  meetingViaLabel,
  nextBookingPageId,
  upsertBookingPage,
  bookingEmbedSnippet,
  bookingIframeSnippet,
  type BookingCurrency,
  type BookingEventType,
  type BookingPage,
  type BookingPageStatus,
  type AvailabilityRule,
  type BookingQuestion,
  type ConsultationMode,
  type MeetingMode,
  type MeetingVia,
} from "@/lib/booking/types";
import { ACTIVITY_OWNERS, avatarColor, initials } from "@/lib/activities/shared";
import {
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import {
  ConsultationSetup,
  type ConsultationSetupValue,
} from "@/components/booking/ConsultationSetup";
import { cn } from "@/lib/utils";

interface BookingPageFormProps {
  layoutId: string;
  redirect: boolean;
  initial?: BookingPage;
  pageId?: string;
  defaultEventType?: BookingEventType;
  defaultConsultationMode?: ConsultationMode;
  defaultTitle?: string;
  defaultDurationMinutes?: number;
  defaultPrice?: number;
  defaultMeetingVia?: MeetingVia;
  defaultMeetingViaDetail?: string;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];
const BUFFER_PRESETS = [0, 5, 10, 15, 30];
const NOTICE_PRESETS = [0, 1, 2, 4, 12, 24];
const ADVANCE_PRESETS = [7, 14, 30, 60, 90];

const EVENT_META: Record<
  BookingEventType,
  { icon: React.ElementType; hint: string; soft: string; text: string }
> = {
  Call: {
    icon: Phone,
    hint: "Phone or quick dial-in",
    soft: "bg-sky-50",
    text: "text-sky-700",
  },
  Meeting: {
    icon: Users,
    hint: "Video or room meeting",
    soft: "bg-violet-50",
    text: "text-violet-700",
  },
  "Site Visit": {
    icon: Building2,
    hint: "On-location appointment",
    soft: "bg-amber-50",
    text: "text-amber-800",
  },
  Consultation: {
    icon: Sparkles,
    hint: "Pick mode below",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
};

function defaultAvailability(): AvailabilityRule[] {
  return WEEKDAYS.map((day) => ({
    day,
    enabled: day !== "Saturday" && day !== "Sunday",
    start: "09:00",
    end: "17:00",
  }));
}

/** Public URL slug: letters, numbers, single hyphens only (never "--"). */
function normalizeBookingSlug(value: string, opts?: { trimEdges?: boolean }) {
  let s = value.toLowerCase().trim();
  s = s.replace(/^https?:\/\//, "");
  const slash = s.indexOf("/");
  if (slash >= 0 && s.slice(0, slash).includes(".")) {
    s = s.slice(slash + 1); // drop domain from pasted full URL
  }
  s = s.replace(/^\/+/, "").replace(/^book\//, "");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-"); // collapse john--discovery → john-discovery
  if (opts?.trimEdges !== false) {
    s = s.replace(/^-|-$/g, "");
  }
  return s.slice(0, 48);
}

function slugify(value: string) {
  return normalizeBookingSlug(value);
}

export function BookingPageForm({
  layoutId: _layoutId,
  redirect: _redirect,
  initial,
  defaultEventType,
  defaultConsultationMode,
  defaultTitle,
  defaultDurationMinutes,
  defaultPrice,
  defaultMeetingVia,
  defaultMeetingViaDetail,
  pageId: pageIdProp,
}: BookingPageFormProps) {
  const router = useRouter();
  const [pageId] = useState(pageIdProp ?? initial?.id ?? nextBookingPageId());
  const isEdit = Boolean(initial || pageIdProp);

  const [title, setTitle] = useState(initial?.title ?? defaultTitle ?? "");
  const [slug, setSlug] = useState(() =>
    initial?.slug ? normalizeBookingSlug(initial.slug) : "",
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [owner, setOwner] = useState<string>(initial?.owner ?? ACTIVITY_OWNERS[0]);

  // Keep Public URL free of "--" (and strip pasted /book/ prefixes)
  useEffect(() => {
    setSlug((s) => normalizeBookingSlug(s));
  }, []);
  const [eventType, setEventType] = useState<BookingEventType>(
    initial?.eventType ?? defaultEventType ?? "Call",
  );
  const [consultationMode, setConsultationMode] = useState<
    ConsultationMode | ""
  >(initial?.consultationMode ?? defaultConsultationMode ?? "");
  const [meetingMode, setMeetingMode] = useState<MeetingMode>(
    initial?.meetingMode ?? "one_time",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl ?? "",
  );
  const [price, setPrice] = useState(initial?.price ?? defaultPrice ?? 0);
  const [currency, setCurrency] = useState<BookingCurrency>(
    initial?.currency ?? "AUD",
  );
  const [isFree, setIsFree] = useState(
    initial?.price == null
      ? defaultPrice == null || defaultPrice <= 0
      : initial.price <= 0,
  );
  const [meetingVia, setMeetingVia] = useState<MeetingVia>(
    initial?.meetingVia ?? defaultMeetingVia ?? "video",
  );
  const [meetingViaDetail, setMeetingViaDetail] = useState(
    initial?.meetingViaDetail ??
      initial?.videoLink ??
      initial?.location ??
      defaultMeetingViaDetail ??
      "",
  );
  const [maxAttendees, setMaxAttendees] = useState(
    initial?.maxAttendees ?? 10,
  );
  const [consultants, setConsultants] = useState<string[]>(
    initial?.consultants ??
      (initial?.owner ? [initial.owner] : []),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.durationMinutes ?? defaultDurationMinutes ?? 30,
  );
  const [bufferMinutes, setBufferMinutes] = useState(
    initial?.bufferMinutes ?? 10,
  );
  const [minNoticeHours, setMinNoticeHours] = useState(
    initial?.minNoticeHours ?? 2,
  );
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    initial?.maxAdvanceDays ?? 60,
  );
  const [timezone, setTimezone] = useState(
    initial?.timezone ?? "Australia/Sydney",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [videoLink, setVideoLink] = useState(initial?.videoLink ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [availability, setAvailability] = useState<AvailabilityRule[]>(
    initial?.availability ?? defaultAvailability(),
  );
  const [selectedAvailDay, setSelectedAvailDay] = useState(
    () =>
      (initial?.availability ?? defaultAvailability()).find((r) => r.enabled)
        ?.day ?? "Monday",
  );
  const [questions, setQuestions] = useState<BookingQuestion[]>(
    initial?.questions ?? [
      { id: "q1", label: "Company name", required: true },
    ],
  );
  const [confirmationTemplate, setConfirmationTemplate] = useState(
    initial?.confirmationTemplate ??
      "Hi {{name}}, your booking is confirmed for {{datetime}}. We look forward to speaking with you.",
  );
  const [reminderTemplate, setReminderTemplate] = useState(
    initial?.reminderTemplate ??
      "Hi {{name}}, reminder: your appointment starts in 1 hour.",
  );
  const [status, setStatus] = useState<BookingPageStatus>(
    initial?.status ?? "Draft",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(!pageIdProp);

  useEffect(() => {
    if (!pageIdProp) {
      setHydrated(true);
      return;
    }
    const live = getBookingPageById(pageIdProp);
    if (live) {
      setTitle(live.title);
      setSlug(normalizeBookingSlug(live.slug));
      setSlugTouched(true);
      setOwner(live.owner);
      setEventType(live.eventType);
      setConsultationMode(live.consultationMode ?? "");
      setMeetingMode(live.meetingMode ?? "one_time");
      setCoverImageUrl(live.coverImageUrl ?? "");
      setPrice(live.price ?? 0);
      setCurrency(live.currency ?? "AUD");
      setIsFree(live.price == null || live.price <= 0);
      setMeetingVia(live.meetingVia ?? "video");
      setMeetingViaDetail(
        live.meetingViaDetail ?? live.videoLink ?? live.location ?? "",
      );
      setMaxAttendees(live.maxAttendees ?? 10);
      setConsultants(
        live.consultants?.length
          ? live.consultants
          : live.owner
            ? [live.owner]
            : [],
      );
      setDurationMinutes(live.durationMinutes);
      setBufferMinutes(live.bufferMinutes);
      setMinNoticeHours(live.minNoticeHours ?? 2);
      setMaxAdvanceDays(live.maxAdvanceDays ?? 60);
      setTimezone(live.timezone);
      setLocation(live.location ?? "");
      setVideoLink(live.videoLink ?? "");
      setDescription(live.description);
      setAvailability(live.availability);
      setSelectedAvailDay(
        live.availability.find((r) => r.enabled)?.day ??
          live.availability[0]?.day ??
          "Monday",
      );
      setQuestions(live.questions);
      setConfirmationTemplate(live.confirmationTemplate);
      setReminderTemplate(live.reminderTemplate);
      setStatus(live.status);
    }
    setHydrated(true);
  }, [pageIdProp]);

  const enabledDays = availability.filter((a) => a.enabled).length;
  const publicPath = slug ? `/book/${slug}` : "/book/…";
  const isConsultation = eventType === "Consultation";

  const consultationValue: ConsultationSetupValue = {
    consultationMode,
    meetingMode,
    title,
    durationMinutes,
    coverImageUrl,
    price,
    currency,
    isFree,
    meetingVia,
    meetingViaDetail,
    maxAttendees,
    consultants,
  };

  useEffect(() => {
    if (!isConsultation) return;
    if (meetingVia === "video") setVideoLink(meetingViaDetail);
    else if (meetingVia === "in_person") setLocation(meetingViaDetail);
  }, [isConsultation, meetingVia, meetingViaDetail]);

  function applyTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function selectEventType(t: BookingEventType) {
    setEventType(t);
    if (t !== "Consultation") {
      setConsultationMode("");
    } else if (!consultationMode) {
      setConsultationMode("one_to_one");
      setMeetingMode("one_time");
    }
  }

  function patchConsultation(patch: Partial<ConsultationSetupValue>) {
    if (patch.consultationMode !== undefined)
      setConsultationMode(patch.consultationMode);
    if (patch.meetingMode !== undefined) setMeetingMode(patch.meetingMode);
    if (patch.durationMinutes !== undefined)
      setDurationMinutes(patch.durationMinutes);
    if (patch.coverImageUrl !== undefined)
      setCoverImageUrl(patch.coverImageUrl);
    if (patch.price !== undefined) setPrice(patch.price);
    if (patch.currency !== undefined) setCurrency(patch.currency);
    if (patch.isFree !== undefined) {
      setIsFree(patch.isFree);
      if (patch.isFree) setPrice(0);
    }
    if (patch.meetingVia !== undefined) setMeetingVia(patch.meetingVia);
    if (patch.meetingViaDetail !== undefined)
      setMeetingViaDetail(patch.meetingViaDetail);
    if (patch.maxAttendees !== undefined)
      setMaxAttendees(patch.maxAttendees);
    if (patch.consultants !== undefined) setConsultants(patch.consultants);
  }

  function updateAvail(day: string, patch: Partial<AvailabilityRule>) {
    setAvailability((prev) =>
      prev.map((r) => (r.day === day ? { ...r, ...patch } : r)),
    );
  }

  function setWeekdaysOnly() {
    setAvailability((prev) =>
      prev.map((r) => ({
        ...r,
        enabled: r.day !== "Saturday" && r.day !== "Sunday",
        start: "09:00",
        end: "17:00",
      })),
    );
  }

  function setAllDays() {
    setAvailability((prev) =>
      prev.map((r) => ({ ...r, enabled: true, start: "09:00", end: "17:00" })),
    );
  }

  function clearWeekend() {
    setAvailability((prev) =>
      prev.map((r) =>
        r.day === "Saturday" || r.day === "Sunday"
          ? { ...r, enabled: false }
          : r,
      ),
    );
  }

  function updateQuestion(id: string, patch: Partial<BookingQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: `q${Date.now()}`, label: "", required: false },
    ]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) =>
      prev.length <= 1 ? prev : prev.filter((q) => q.id !== id),
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim())
      next.title = isConsultation
        ? "Consultation name is required"
        : "Title is required";
    if (!slug.trim()) next.slug = "URL slug is required";
    else if (!/^[a-z0-9-]+$/.test(slug))
      next.slug = "Use lowercase letters, numbers, hyphens only";
    if (durationMinutes < 5) next.duration = "At least 5 minutes";
    if (enabledDays === 0) next.availability = "Enable at least one day";
    if (questions.some((q) => !q.label.trim()))
      next.questions = "Every question needs a label";
    if (isConsultation) {
      if (!consultationMode)
        next.consultationMode = "Choose a consultation type";
      if (!meetingMode) next.meetingMode = "Choose One Time or Recurring";
      if (!isFree && (!price || price <= 0))
        next.price = "Enter a price or mark as Free";
      if (!meetingViaDetail.trim())
        next.meetingViaDetail = "Add how guests will join";
      if (consultationMode === "group" && maxAttendees < 2)
        next.maxAttendees = "Group needs at least 2 attendees";
      if (consultants.length === 0)
        next.consultants = "Assign at least one consultant";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPage(): BookingPage {
    const today = new Date().toLocaleDateString("en-AU");
    const live = getBookingPageById(pageId);
    return {
      id: pageId,
      title: title.trim(),
      slug: normalizeBookingSlug(slug),
      owner,
      eventType,
      durationMinutes,
      bufferMinutes,
      minNoticeHours,
      maxAdvanceDays,
      timezone,
      location: isConsultation
        ? meetingVia === "in_person" ||
          meetingVia === "phone" ||
          meetingVia === "custom"
          ? meetingViaDetail.trim() || undefined
          : undefined
        : location.trim() || undefined,
      videoLink: isConsultation
        ? meetingVia === "video"
          ? meetingViaDetail.trim() || undefined
          : undefined
        : videoLink.trim() || undefined,
      description: description.trim(),
      availability,
      questions: questions.map((q) => ({
        ...q,
        label: q.label.trim(),
      })),
      confirmationTemplate,
      reminderTemplate,
      status,
      views: live?.views ?? initial?.views ?? 0,
      bookingsCount: live?.bookingsCount ?? initial?.bookingsCount ?? 0,
      cancelRate: live?.cancelRate ?? initial?.cancelRate ?? 0,
      createdAt: initial?.createdAt ?? live?.createdAt ?? today,
      consultationMode: isConsultation
        ? consultationMode || undefined
        : undefined,
      meetingMode: isConsultation ? meetingMode : undefined,
      coverImageUrl: isConsultation
        ? coverImageUrl.trim() || undefined
        : undefined,
      price: isConsultation ? (isFree ? 0 : price) : undefined,
      currency: isConsultation ? currency : undefined,
      meetingVia: isConsultation ? meetingVia : undefined,
      meetingViaDetail: isConsultation
        ? meetingViaDetail.trim() || undefined
        : undefined,
      maxAttendees:
        isConsultation && consultationMode === "group"
          ? maxAttendees
          : undefined,
      consultants: isConsultation ? consultants : undefined,
    };
  }

  function onSave(createAnother: boolean) {
    if (!validate()) {
      document
        .getElementById("booking-section-basics")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    upsertBookingPage(buildPage());
    if (createAnother) {
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setStatus("Draft");
      setConsultationMode("");
      setMeetingMode("one_time");
      setCoverImageUrl("");
      setPrice(0);
      setIsFree(true);
      setMeetingVia("video");
      setMeetingViaDetail("");
      setConsultants([]);
      setErrors({});
      return;
    }
    router.push("/booking");
  }

  function copyLink() {
    if (!slug) return;
    const url = `${window.location.origin}${publicPath}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function insertToken(which: "confirmation" | "reminder", token: string) {
    const t = `{{${token}}}`;
    if (which === "confirmation") setConfirmationTemplate((p) => p + t);
    else setReminderTemplate((p) => p + t);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full p-2.5 sm:p-3 lg:p-4">

          {/* Compact header */}
          <div className="relative mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
                {isEdit ? "Edit booking page" : "Create booking page"}
              </h1>
            </div>
            {slug ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied" : "Copy link"}
                </button>
                <Link
                  href={publicPath}
                  target="_blank"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>

          {/* ONE surface: fills available width */}
          <div className="relative flex min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 divide-y divide-slate-100 border-b border-slate-100 lg:border-r lg:border-b-0">
                {/* BASICS */}
                <section id="booking-section-basics" className="p-2.5 sm:p-3">
                  <SectionHead
                    step="1"
                    title="Basics"
                    body={
                      isConsultation
                        ? "URL, consultation type, and schedule."
                        : "Title, URL, event type, and duration."
                    }
                  />

                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    {!isConsultation ? (
                    <Field
                      label="Title"
                      required
                      error={errors.title}
                      className="sm:col-span-2"
                    >
                      <InputShell icon={CalendarClock} error={!!errors.title}>
                        <input
                          value={title}
                          onChange={(e) => applyTitle(e.target.value)}
                          placeholder="e.g. Discovery Call"
                          className={elevatedInputClass(true)}
                        />
                      </InputShell>
                    </Field>
                    ) : null}

                    <Field
                      label="Public URL"
                      required
                      error={errors.slug}
                      className="sm:col-span-2"
                    >
                      <InputShell icon={Link2} error={!!errors.slug}>
                        <div className="flex w-full min-w-0 items-center">
                          <span className="shrink-0 pl-9 text-[12px] text-slate-400">
                            /book/
                          </span>
                          <input
                            value={slug}
                            onChange={(e) => {
                              setSlugTouched(true);
                              // Keep a single trailing "-" while typing; never allow "--"
                              setSlug(
                                normalizeBookingSlug(e.target.value, {
                                  trimEdges: false,
                                }),
                              );
                            }}
                            onBlur={() =>
                              setSlug((s) => normalizeBookingSlug(s))
                            }
                            placeholder="john-discovery"
                            className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </InputShell>
                    </Field>

                    <Field label="Owner">
                      <InputShell icon={User}>
                        <select
                          value={owner}
                          onChange={(e) => setOwner(e.target.value)}
                          className={elevatedSelectClass(true)}
                        >
                          {ACTIVITY_OWNERS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </InputShell>
                    </Field>

                    <Field label="Timezone">
                      <InputShell icon={Globe}>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className={elevatedSelectClass(true)}
                        >
                          <option value="Australia/Sydney">
                            Australia/Sydney
                          </option>
                          <option value="Australia/Melbourne">
                            Australia/Melbourne
                          </option>
                          <option value="Australia/Brisbane">
                            Australia/Brisbane
                          </option>
                          <option value="UTC">UTC</option>
                        </select>
                      </InputShell>
                    </Field>
                  </div>

                  <div className="mt-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                      Event type
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                      {BOOKING_EVENT_TYPES.map((t) => {
                        const meta = EVENT_META[t];
                        const Icon = meta.icon;
                        const active = eventType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => selectEventType(t)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all",
                              active
                                ? "border-violet-300 bg-violet-50 shadow-[0_0_0_2px_rgba(139,92,246,0.12)]"
                                : "border-slate-200 bg-white hover:border-violet-200",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                meta.soft,
                                meta.text,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-semibold text-slate-900">
                                {t}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {isConsultation ? (
                      <ConsultationSetup
                        value={consultationValue}
                        errors={errors}
                        onChange={patchConsultation}
                        onTitleChange={applyTitle}
                      />
                    ) : null}
                  </div>

                  {!isConsultation ? (
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                        Duration
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {DURATION_PRESETS.map((m) => (
                          <Chip
                            key={m}
                            active={durationMinutes === m}
                            onClick={() => setDurationMinutes(m)}
                            label={`${m}m`}
                          />
                        ))}
                      </div>
                      {errors.duration ? (
                        <p className="mt-1 text-[11px] font-medium text-rose-500">
                          {errors.duration}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                        Buffer
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {BUFFER_PRESETS.map((m) => (
                          <Chip
                            key={m}
                            active={bufferMinutes === m}
                            onClick={() => setBufferMinutes(m)}
                            label={m === 0 ? "None" : `${m}m`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="mt-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                      Buffer
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {BUFFER_PRESETS.map((m) => (
                        <Chip
                          key={m}
                          active={bufferMinutes === m}
                          onClick={() => setBufferMinutes(m)}
                          label={m === 0 ? "None" : `${m}m`}
                        />
                      ))}
                    </div>
                  </div>
                  )}

                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                        Min notice
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {NOTICE_PRESETS.map((h) => (
                          <Chip
                            key={h}
                            active={minNoticeHours === h}
                            onClick={() => setMinNoticeHours(h)}
                            label={h === 0 ? "None" : `${h}h`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                        Book ahead
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {ADVANCE_PRESETS.map((d) => (
                          <Chip
                            key={d}
                            active={maxAdvanceDays === d}
                            onClick={() => setMaxAdvanceDays(d)}
                            label={`${d}d`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Field label="Description shown to guests">
                      <TextAreaShell>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What should guests expect?"
                          className={cn(elevatedTextareaClass, "!min-h-[64px]")}
                          rows={2}
                        />
                      </TextAreaShell>
                    </Field>
                  </div>
                </section>

                {/* SCHEDULE */}
                <section id="booking-section-schedule" className="p-2.5 sm:p-3">
                  <SectionHead
                    step="2"
                    title="Availability"
                    body="Weekly hours guests can book."
                  />
                  {errors.availability ? (
                    <p className="mt-1.5 text-[11px] font-medium text-rose-500">
                      {errors.availability}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      <PresetBtn
                        onClick={setWeekdaysOnly}
                        label="Weekdays 9-5"
                      />
                      <PresetBtn onClick={setAllDays} label="Every day" />
                      <PresetBtn
                        onClick={clearWeekend}
                        label="Clear weekend"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {enabledDays} open · {durationMinutes}m · {bufferMinutes}
                      m buffer
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {availability.map((r) => {
                      const selected = selectedAvailDay === r.day;
                      const short = r.day.slice(0, 3);
                      return (
                        <button
                          key={r.day}
                          type="button"
                          onClick={() => setSelectedAvailDay(r.day)}
                          className={cn(
                            "relative flex flex-col items-center rounded-lg border px-1 py-1.5 transition-all",
                            selected
                              ? "border-violet-400 bg-violet-50 shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
                              : r.enabled
                                ? "border-violet-200 bg-white hover:border-violet-300"
                                : "border-slate-200 bg-slate-50/80 text-slate-400 hover:border-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              selected || r.enabled
                                ? "text-slate-900"
                                : "text-slate-400",
                            )}
                          >
                            {short}
                          </span>
                          {r.enabled ? (
                            <span className="mt-0.5 h-1 w-1 rounded-full bg-violet-500" />
                          ) : (
                            <span className="mt-0.5 h-1 w-1 rounded-full bg-transparent" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const selected =
                      availability.find((r) => r.day === selectedAvailDay) ??
                      availability[0];
                    if (!selected) return null;
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateAvail(selected.day, {
                              enabled: !selected.enabled,
                            })
                          }
                          className={cn(
                            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-all",
                            selected.enabled
                              ? "border-violet-300 bg-violet-600 text-white"
                              : "border-slate-200 bg-white text-slate-500",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 items-center justify-center rounded border",
                              selected.enabled
                                ? "border-white/40 bg-white/20"
                                : "border-slate-300",
                            )}
                          >
                            {selected.enabled ? (
                              <Check className="h-2.5 w-2.5" />
                            ) : null}
                          </span>
                          {selected.day}
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            Start
                          </label>
                          <input
                            type="time"
                            disabled={!selected.enabled}
                            value={selected.start}
                            onChange={(e) =>
                              updateAvail(selected.day, {
                                start: e.target.value,
                              })
                            }
                            className={cn(
                              "h-7 w-[7.25rem] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-violet-500",
                              !selected.enabled && "opacity-40",
                            )}
                          />
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            End
                          </label>
                          <input
                            type="time"
                            disabled={!selected.enabled}
                            value={selected.end}
                            onChange={(e) =>
                              updateAvail(selected.day, {
                                end: e.target.value,
                              })
                            }
                            className={cn(
                              "h-7 w-[7.25rem] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-violet-500",
                              !selected.enabled && "opacity-40",
                            )}
                          />
                        </div>
                        {!selected.enabled ? (
                          <p className="w-full text-[10px] text-slate-400 sm:w-auto">
                            Off - tap the day name to enable
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </section>

                {/* LOCATION - non-consultation only; consultations use Meeting via */}
                {!isConsultation ? (
                <section id="booking-section-location" className="p-2.5 sm:p-3">
                  <SectionHead
                    step="3"
                    title="Location"
                    body="Video link and/or address."
                  />
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <Field label="Video link">
                      <InputShell icon={Video}>
                        <input
                          value={videoLink}
                          onChange={(e) => setVideoLink(e.target.value)}
                          placeholder="https://meet.google.com/…"
                          className={elevatedInputClass(true)}
                        />
                      </InputShell>
                    </Field>
                    <Field label="Location / address">
                      <InputShell icon={MapPin}>
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Office address or room"
                          className={elevatedInputClass(true)}
                        />
                      </InputShell>
                    </Field>
                  </div>
                </section>
                ) : null}

                {/* QUESTIONS */}
                <section id="booking-section-questions" className="p-2.5 sm:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <SectionHead
                      step="4"
                      title="Booking questions"
                      body="Extra fields before confirm."
                    />
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-violet-50 px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  {errors.questions ? (
                    <p className="mt-1.5 text-[11px] font-medium text-rose-500">
                      {errors.questions}
                    </p>
                  ) : null}
                  <div className="mt-2 space-y-1.5">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-400 shadow-sm">
                          {idx + 1}
                        </span>
                        <div className="min-w-[160px] flex-1">
                          <InputShell>
                            <input
                              value={q.label}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="e.g. Company name"
                              className={elevatedInputClass()}
                            />
                          </InputShell>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(q.id, { required: !q.required })
                          }
                          className={cn(
                            "inline-flex h-8 items-center rounded-md border px-2 text-[10px] font-semibold",
                            q.required
                              ? "border-rose-200 bg-rose-50 text-rose-600"
                              : "border-slate-200 bg-white text-slate-500",
                          )}
                        >
                          {q.required ? "Required" : "Optional"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          disabled={questions.length <= 1}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* MESSAGES */}
                <section id="booking-section-messages" className="p-2.5 sm:p-3">
                  <SectionHead
                    step="5"
                    title="Confirmation & reminders"
                    body="Templates: click tokens to insert."
                  />
                  <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          <Mail className="h-3 w-3 text-violet-600" />
                          Confirmation
                        </label>
                        <TokenBar
                          onInsert={(t) => insertToken("confirmation", t)}
                        />
                      </div>
                      <TextAreaShell>
                        <textarea
                          value={confirmationTemplate}
                          onChange={(e) =>
                            setConfirmationTemplate(e.target.value)
                          }
                          className={cn(elevatedTextareaClass, "!min-h-[56px]")}
                          rows={2}
                        />
                      </TextAreaShell>
                    </div>
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          <Bell className="h-3 w-3 text-violet-600" />
                          Reminder
                        </label>
                        <TokenBar
                          onInsert={(t) => insertToken("reminder", t)}
                        />
                      </div>
                      <TextAreaShell>
                        <textarea
                          value={reminderTemplate}
                          onChange={(e) => setReminderTemplate(e.target.value)}
                          className={cn(elevatedTextareaClass, "!min-h-[56px]")}
                          rows={2}
                        />
                      </TextAreaShell>
                    </div>
                  </div>
                </section>

                {/* PUBLISH */}
                <section id="booking-section-publish" className="p-2.5 sm:p-3">
                  <SectionHead
                    step="6"
                    title="Publish"
                    body="Draft private · Live bookable."
                  />
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus("Draft")}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-left transition-all",
                        status === "Draft"
                          ? "border-slate-300 bg-slate-50 shadow-sm"
                          : "border-slate-100 hover:border-slate-200",
                      )}
                    >
                      <p className="text-[12px] font-semibold text-slate-900">
                        Draft
                      </p>
                      <p className="text-[10px] text-slate-500">Private link</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Live")}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-left transition-all",
                        status === "Live"
                          ? "border-emerald-300 bg-emerald-50 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]"
                          : "border-slate-100 hover:border-emerald-200",
                      )}
                    >
                      <p className="text-[12px] font-semibold text-emerald-800">
                        Live
                      </p>
                      <p className="text-[10px] text-emerald-700/80">
                        Public bookable
                      </p>
                    </button>
                  </div>

                  <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                    <p className="mb-1.5 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                      Share URL
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-700">
                        {publicPath}
                      </code>
                      <button
                        type="button"
                        onClick={copyLink}
                        disabled={!slug}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        <Copy className="h-3 w-3" />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    {slug ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                          Linktree / email embed
                        </p>
                        <pre className="overflow-x-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[10px] text-slate-600">
                          {bookingEmbedSnippet(slug, title || undefined)}
                        </pre>
                        <p className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                          Iframe embed
                        </p>
                        <pre className="overflow-x-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[10px] text-slate-600">
                          {bookingIframeSnippet(slug)}
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      Lead + contact on book
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      Meeting + .ics / Google / Outlook
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      Guest reschedule / cancel
                    </li>
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      Confirm + reminder queued
                    </li>
                  </ul>
                </section>
              </div>

              {/* Preview: sticky on desktop */}
              <aside className="bg-slate-50/70 p-2.5 sm:p-3 lg:sticky lg:top-0 lg:self-stretch">
                <p className="mb-2 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                  Guest preview
                </p>
                <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
                  {isConsultation && coverImageUrl.trim() ? (
                    <div className="mb-2 -mx-3 -mt-3 overflow-hidden rounded-t-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImageUrl}
                        alt=""
                        className="h-16 w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}
                  <p className="text-[9px] font-semibold tracking-wide text-violet-600 uppercase">
                    FinConnex
                  </p>
                  <h3 className="mt-0.5 text-[13px] font-bold text-slate-900">
                    {title || "Untitled booking"}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                    {description ||
                      "Description will appear here for guests…"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[9px] text-slate-500">
                    <span className="inline-flex items-center gap-0.5 rounded bg-slate-50 px-1.5 py-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {durationMinutes}m
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5",
                        EVENT_META[eventType].soft,
                        EVENT_META[eventType].text,
                      )}
                    >
                      {isConsultation && consultationMode
                        ? consultationModeLabel(consultationMode)
                        : eventType}
                    </span>
                    {isConsultation && meetingMode ? (
                      <span className="inline-flex items-center rounded bg-slate-50 px-1.5 py-0.5">
                        {meetingModeLabel(meetingMode)}
                      </span>
                    ) : null}
                    {isConsultation ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
                        <DollarSign className="h-2.5 w-2.5" />
                        {formatBookingPrice(isFree ? 0 : price, currency)}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold",
                        status === "Live"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {status}
                    </span>
                  </div>
                  {(isConsultation
                    ? meetingViaDetail || meetingVia
                    : videoLink || location) && (
                    <div className="mt-2 space-y-0.5 border-t border-slate-50 pt-2 text-[9px] text-slate-500">
                      {isConsultation ? (
                        <p className="flex items-center gap-1">
                          {meetingVia === "video" ? (
                            <Video className="h-2.5 w-2.5 shrink-0" />
                          ) : meetingVia === "in_person" ? (
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                          ) : (
                            <Phone className="h-2.5 w-2.5 shrink-0" />
                          )}
                          {meetingViaLabel(meetingVia)}
                          {meetingViaDetail ? ` · ${meetingViaDetail}` : ""}
                        </p>
                      ) : (
                        <>
                          {videoLink ? (
                            <p className="flex items-center gap-1">
                              <Video className="h-2.5 w-2.5 shrink-0" />
                              Video call
                            </p>
                          ) : null}
                          {location ? (
                            <p className="flex items-center gap-1 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {location}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                  {isConsultation && consultants.length > 0 ? (
                    <div className="mt-2 border-t border-slate-50 pt-2">
                      <p className="mb-1 text-[9px] font-semibold text-slate-400">
                        Consultant{consultants.length > 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-1">
                        {consultants.map((name) => (
                          <li
                            key={name}
                            className="flex items-center gap-1.5 text-[9px] text-slate-600"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-semibold",
                                avatarColor(name),
                              )}
                            >
                              {initials(name)}
                            </span>
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {questions.some((q) => q.label.trim()) ? (
                    <div className="mt-2 border-t border-slate-50 pt-2">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                        <MessageSquare className="h-2.5 w-2.5" />
                        Asks
                      </p>
                      <ul className="space-y-0.5">
                        {questions
                          .filter((q) => q.label.trim())
                          .map((q) => (
                            <li
                              key={q.id}
                              className="truncate text-[9px] text-slate-600"
                            >
                              {q.label}
                              {q.required ? (
                                <span className="text-rose-400"> *</span>
                              ) : null}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="mt-2.5 h-7 rounded-md bg-violet-600 text-center text-[10px] leading-7 font-semibold text-white">
                    Continue
                  </div>
                </div>
                <p className="mt-2 text-center text-[9px] text-slate-400">
                  {enabledDays} available day{enabledDays === 1 ? "" : "s"} ·{" "}
                  {owner.split(" ")[0]}
                </p>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: always visible, never covers scroll content */}
      <div className="shrink-0 border-t border-slate-200/80 bg-white px-2.5 py-2.5 sm:px-3 lg:px-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="hidden text-[11px] text-slate-400 sm:block">
            Scroll to review all sections · Required fields marked
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/booking")}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              className="h-9 rounded-lg border border-violet-200 bg-violet-50 px-3.5 text-[12px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="h-9 rounded-lg bg-violet-600 px-4 text-[12px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              {isEdit ? "Save changes" : "Save page"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
        {step}
      </span>
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-slate-900">
          {title}
          <span className="ml-1.5 font-normal text-slate-400">{body}</span>
        </h2>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
        active
          ? "bg-violet-600 text-white shadow-sm shadow-violet-600/25"
          : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200",
      )}
    >
      {label}
    </button>
  );
}

function PresetBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function TokenBar({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {["name", "datetime", "location"].map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onInsert(t)}
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-500 hover:border-violet-200 hover:text-violet-700"
        >
          {`{{${t}}}`}
        </button>
      ))}
    </div>
  );
}
