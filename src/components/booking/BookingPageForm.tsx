"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
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
} from "lucide-react";
import {
  BOOKING_EVENT_TYPES,
  WEEKDAYS,
  type BookingEventType,
  type BookingPage,
  type BookingPageStatus,
  type AvailabilityRule,
  type BookingQuestion,
} from "@/lib/booking/types";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

interface BookingPageFormProps {
  layoutId: string;
  redirect: boolean;
  initial?: BookingPage;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];
const BUFFER_PRESETS = [0, 5, 10, 15, 30];

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
    hint: "Advisory session",
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function BookingPageForm({
  layoutId: _layoutId,
  redirect: _redirect,
  initial,
}: BookingPageFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [owner, setOwner] = useState<string>(initial?.owner ?? ACTIVITY_OWNERS[0]);
  const [eventType, setEventType] = useState<BookingEventType>(
    initial?.eventType ?? "Call",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.durationMinutes ?? 30,
  );
  const [bufferMinutes, setBufferMinutes] = useState(
    initial?.bufferMinutes ?? 10,
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
      "Hi {{name}}, reminder — your appointment starts in 1 hour.",
  );
  const [status, setStatus] = useState<BookingPageStatus>(
    initial?.status ?? "Draft",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const enabledDays = availability.filter((a) => a.enabled).length;
  const publicPath = slug ? `/book/${slug}` : "/book/…";

  const previewTokens = useMemo(
    () => ({
      name: "Alex Guest",
      datetime: "Thu 23 Jul · 10:00 AM",
      location: location || "Video call",
    }),
    [location],
  );

  function applyTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
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
    if (!title.trim()) next.title = "Title is required";
    if (!slug.trim()) next.slug = "URL slug is required";
    else if (!/^[a-z0-9-]+$/.test(slug))
      next.slug = "Use lowercase letters, numbers, hyphens only";
    if (durationMinutes < 5) next.duration = "At least 5 minutes";
    if (enabledDays === 0) next.availability = "Enable at least one day";
    if (questions.some((q) => !q.label.trim()))
      next.questions = "Every question needs a label";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) {
      document
        .getElementById("booking-section-basics")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (createAnother) {
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setStatus("Draft");
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-[1200px] p-3 sm:p-4 lg:p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
          />

          {/* Compact header */}
          <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <nav className="flex items-center gap-1 text-[10px] text-slate-400">
                <Link
                  href="/"
                  className="flex items-center gap-0.5 hover:text-slate-600"
                >
                  <Home className="h-3 w-3" />
                  Home
                </Link>
                <span>/</span>
                <Link href="/booking" className="hover:text-slate-600">
                  Booking
                </Link>
                <span>/</span>
              </nav>
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
                {isEdit ? "Edit booking page" : "Create booking page"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
                <CalendarClock className="h-2.5 w-2.5" />
                Self-serve
              </span>
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

          {/* ONE surface — all sections visible */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 divide-y divide-slate-100 border-b border-slate-100 lg:border-r lg:border-b-0">
                {/* BASICS */}
                <section id="booking-section-basics" className="p-4 sm:p-5">
                  <SectionHead
                    step="1"
                    title="Basics"
                    body="Title, public URL, event type, and duration."
                  />

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                              setSlug(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, ""),
                              );
                            }}
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

                  <div className="mt-5">
                    <p className="mb-2 text-[12px] font-semibold text-slate-700">
                      Event type
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {BOOKING_EVENT_TYPES.map((t) => {
                        const meta = EVENT_META[t];
                        const Icon = meta.icon;
                        const active = eventType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEventType(t)}
                            className={cn(
                              "rounded-xl border px-3 py-3 text-left transition-all",
                              active
                                ? "border-violet-300 bg-violet-50 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                                : "border-slate-200 bg-white hover:border-violet-200",
                            )}
                          >
                            <span
                              className={cn(
                                "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
                                meta.soft,
                                meta.text,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-[12px] font-semibold text-slate-900">
                              {t}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {meta.hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-slate-700">
                        Duration
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {DURATION_PRESETS.map((m) => (
                          <Chip
                            key={m}
                            active={durationMinutes === m}
                            onClick={() => setDurationMinutes(m)}
                            label={`${m} min`}
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
                      <p className="mb-2 text-[12px] font-semibold text-slate-700">
                        Buffer between bookings
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {BUFFER_PRESETS.map((m) => (
                          <Chip
                            key={m}
                            active={bufferMinutes === m}
                            onClick={() => setBufferMinutes(m)}
                            label={m === 0 ? "None" : `${m} min`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Field label="Description shown to guests">
                      <TextAreaShell>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What should guests expect on this call?"
                          className={elevatedTextareaClass}
                          rows={3}
                        />
                      </TextAreaShell>
                    </Field>
                  </div>
                </section>

                {/* SCHEDULE */}
                <section id="booking-section-schedule" className="p-4 sm:p-5">
                  <SectionHead
                    step="2"
                    title="Availability"
                    body="Weekly hours guests can book. Buffer applies between slots."
                  />
                  {errors.availability ? (
                    <p className="mt-2 text-[11px] font-medium text-rose-500">
                      {errors.availability}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <PresetBtn onClick={setWeekdaysOnly} label="Weekdays 9–5" />
                    <PresetBtn onClick={setAllDays} label="Every day" />
                    <PresetBtn onClick={clearWeekend} label="Clear weekend" />
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                    <div className="grid grid-cols-[minmax(0,1fr)_100px_100px] gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      <span>Day</span>
                      <span>Start</span>
                      <span>End</span>
                    </div>
                    {availability.map((r) => (
                      <div
                        key={r.day}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_100px_100px] items-center gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0",
                          !r.enabled && "bg-slate-50/40",
                        )}
                      >
                        <label className="flex cursor-pointer items-center gap-2.5 text-[12px] font-medium text-slate-700">
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                              r.enabled
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-slate-300 bg-white",
                            )}
                          >
                            {r.enabled ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={r.enabled}
                            onChange={(e) =>
                              updateAvail(r.day, { enabled: e.target.checked })
                            }
                          />
                          {r.day}
                        </label>
                        <input
                          type="time"
                          disabled={!r.enabled}
                          value={r.start}
                          onChange={(e) =>
                            updateAvail(r.day, { start: e.target.value })
                          }
                          className={cn(
                            "h-9 w-full rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
                            !r.enabled && "opacity-40",
                          )}
                        />
                        <input
                          type="time"
                          disabled={!r.enabled}
                          value={r.end}
                          onChange={(e) =>
                            updateAvail(r.day, { end: e.target.value })
                          }
                          className={cn(
                            "h-9 w-full rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]",
                            !r.enabled && "opacity-40",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {enabledDays} day{enabledDays === 1 ? "" : "s"} open ·{" "}
                    {durationMinutes} min slots · {bufferMinutes} min buffer
                  </p>
                </section>

                {/* LOCATION */}
                <section id="booking-section-location" className="p-4 sm:p-5">
                  <SectionHead
                    step="3"
                    title="Location"
                    body="Video link and/or physical address for guests."
                  />
                  <div className="mt-4 space-y-4">
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
                          placeholder="Office address or room name"
                          className={elevatedInputClass(true)}
                        />
                      </InputShell>
                    </Field>
                  </div>
                </section>

                {/* QUESTIONS */}
                <section id="booking-section-questions" className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <SectionHead
                      step="4"
                      title="Booking questions"
                      body="Extra fields guests answer before confirming."
                    />
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                  {errors.questions ? (
                    <p className="mt-2 text-[11px] font-medium text-rose-500">
                      {errors.questions}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-slate-400 shadow-sm">
                          {idx + 1}
                        </span>
                        <div className="min-w-[180px] flex-1">
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
                            "inline-flex h-9 items-center rounded-lg border px-2.5 text-[11px] font-semibold",
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* MESSAGES */}
                <section id="booking-section-messages" className="p-4 sm:p-5">
                  <SectionHead
                    step="5"
                    title="Confirmation & reminders"
                    body="Email/SMS templates. Click tokens to insert."
                  />
                  <div className="mt-4 space-y-5">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                          <Mail className="h-3.5 w-3.5 text-violet-600" />
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
                          className={elevatedTextareaClass}
                          rows={3}
                        />
                      </TextAreaShell>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                        Preview:{" "}
                        {confirmationTemplate
                          .replace(/\{\{name\}\}/g, previewTokens.name)
                          .replace(
                            /\{\{datetime\}\}/g,
                            previewTokens.datetime,
                          )
                          .replace(
                            /\{\{location\}\}/g,
                            previewTokens.location,
                          )}
                      </p>
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                          <Bell className="h-3.5 w-3.5 text-violet-600" />
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
                          className={elevatedTextareaClass}
                          rows={3}
                        />
                      </TextAreaShell>
                    </div>
                  </div>
                </section>

                {/* PUBLISH */}
                <section id="booking-section-publish" className="p-4 sm:p-5">
                  <SectionHead
                    step="6"
                    title="Publish"
                    body="Draft stays private. Live is bookable from any link."
                  />
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStatus("Draft")}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-3.5 text-left transition-all",
                        status === "Draft"
                          ? "border-slate-300 bg-slate-50 shadow-sm"
                          : "border-slate-100 hover:border-slate-200",
                      )}
                    >
                      <p className="text-[13px] font-semibold text-slate-900">
                        Draft
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Only you can open the link
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Live")}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-3.5 text-left transition-all",
                        status === "Live"
                          ? "border-emerald-300 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                          : "border-slate-100 hover:border-emerald-200",
                      )}
                    >
                      <p className="text-[13px] font-semibold text-emerald-800">
                        Live
                      </p>
                      <p className="mt-0.5 text-[11px] text-emerald-700/80">
                        Anyone with the link can book
                      </p>
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      Share URL
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-700">
                        {publicPath}
                      </code>
                      <button
                        type="button"
                        onClick={copyLink}
                        disabled={!slug}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">
                      Embed for Linktree / Forms
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] text-slate-600">
                      {`<a href="${publicPath}">Book a ${title || "meeting"}</a>`}
                    </pre>
                  </div>

                  <ul className="mt-4 space-y-1.5 text-[12px] text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Auto-create Lead on booking
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Sync to Calendar &amp; Meetings
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Guest self-service reschedule / cancel
                    </li>
                  </ul>
                </section>
              </div>

              {/* Preview — sticky on desktop */}
              <aside className="bg-slate-50/70 p-4 lg:sticky lg:top-0 lg:self-start">
                <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Guest preview
                </p>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
                    FinConnex
                  </p>
                  <h3 className="mt-1 text-[15px] font-bold text-slate-900">
                    {title || "Untitled booking"}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                    {description ||
                      "Description will appear here for guests…"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1">
                      <Clock className="h-3 w-3" />
                      {durationMinutes} min
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-1",
                        EVENT_META[eventType].soft,
                        EVENT_META[eventType].text,
                      )}
                    >
                      {eventType}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold",
                        status === "Live"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {status}
                    </span>
                  </div>
                  {(videoLink || location) && (
                    <div className="mt-3 space-y-1 border-t border-slate-50 pt-3 text-[10px] text-slate-500">
                      {videoLink ? (
                        <p className="flex items-center gap-1">
                          <Video className="h-3 w-3 shrink-0" />
                          Video call
                        </p>
                      ) : null}
                      {location ? (
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {location}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {questions.some((q) => q.label.trim()) ? (
                    <div className="mt-3 border-t border-slate-50 pt-3">
                      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <MessageSquare className="h-3 w-3" />
                        Asks
                      </p>
                      <ul className="space-y-1">
                        {questions
                          .filter((q) => q.label.trim())
                          .map((q) => (
                            <li
                              key={q.id}
                              className="truncate text-[10px] text-slate-600"
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
                  <div className="mt-4 h-8 rounded-lg bg-violet-600 text-center text-[11px] leading-8 font-semibold text-white">
                    Continue
                  </div>
                </div>
                <p className="mt-3 text-center text-[10px] text-slate-400">
                  {enabledDays} available day{enabledDays === 1 ? "" : "s"} ·{" "}
                  {owner.split(" ")[0]}
                </p>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — always visible, never covers scroll content */}
      <div className="shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2">
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
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-[11px] font-bold text-white shadow-sm shadow-violet-600/25">
        {step}
      </span>
      <div>
        <h2 className="text-[14px] font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">{body}</p>
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
        "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
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
