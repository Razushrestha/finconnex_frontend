"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  User,
  Users,
  MapPin,
  Video,
  Link2,
  Calendar,
} from "lucide-react";
import {
  MEETING_TYPES,
  MEETING_STATUSES,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import {
  ACTIVITY_OWNERS,
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface CreateMeetingFormProps {
  layoutId: string;
  redirect: boolean;
}
interface FormState {
  title: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  type: MeetingType | "";
  startDateTime: string;
  endDateTime: string;
  location: string;
  meetingLink: string;
  attendees: string;
  organizer: string;
  status: MeetingStatus | "";
  agenda: string;
  notes: string;
}

const initialState: FormState = {
  title: "",
  relatedKind: "",
  relatedName: "",
  type: "Video Call",
  startDateTime: "",
  endDateTime: "",
  location: "",
  meetingLink: "",
  attendees: "",
  organizer: "John Smith",
  status: "Scheduled",
  agenda: "",
  notes: "",
};

export function CreateMeetingForm({
  layoutId,
  redirect,
}: CreateMeetingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = form.relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
    : RELATED_RECORD_OPTIONS;

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.type) next.type = "Type is required";
    if (!form.startDateTime) next.startDateTime = "Start date/time is required";
    if (!form.endDateTime) next.endDateTime = "End date/time is required";
    if (!form.organizer.trim()) next.organizer = "Organizer is required";
    if (!form.status) next.status = "Status is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    console.log("Saving meeting", { layoutId, redirect, ...form });
    if (createAnother) {
      setForm({ ...initialState, organizer: form.organizer });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/activities/meetings");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Meetings", href: "/activities/meetings" }}
      badge="New meeting"
      title="Create Meeting"
      subtitle="Schedule a call or in-person session — set time, attendees, and agenda."
      tip="Tip: Title, type, start/end, organizer & status are required."
      cardIcon={CalendarDays}
      cardTitle="Meeting Information"
      cardDescription="Fields marked required are needed to save (SRS §7.5)"
      listHref="/activities/meetings"
      saveLabel="Save Meeting"
      onSave={handleSave}
    >
      <Field
        label="Title"
        required
        error={submitted ? errors.title : undefined}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell
          icon={CalendarDays}
          error={!!(submitted && errors.title)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Project Kickoff Meeting"
          />
        </InputShell>
      </Field>

      <Field label="Related Entity">
        <InputShell icon={Link2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.relatedKind}
            onChange={(e) => {
              update("relatedKind", e.target.value as RelatedEntityKind | "");
              update("relatedName", "");
            }}
          >
            <option value="">None</option>
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related To">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.relatedName}
            onChange={(e) => update("relatedName", e.target.value)}
            disabled={!form.relatedKind}
          >
            <option value="">Select record</option>
            {relatedOptions.map((r) => (
              <option key={`${r.kind}-${r.name}`} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Type"
        required
        error={submitted ? errors.type : undefined}
      >
        <InputShell error={!!(submitted && errors.type)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.type}
            onChange={(e) => update("type", e.target.value as MeetingType)}
          >
            {MEETING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field
        label="Start"
        required
        error={submitted ? errors.startDateTime : undefined}
      >
        <InputShell
          icon={Calendar}
          error={!!(submitted && errors.startDateTime)}
        >
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.startDateTime}
            onChange={(e) => update("startDateTime", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="End"
        required
        error={submitted ? errors.endDateTime : undefined}
      >
        <InputShell
          icon={Calendar}
          error={!!(submitted && errors.endDateTime)}
        >
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.endDateTime}
            onChange={(e) => update("endDateTime", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Status"
        required
        error={submitted ? errors.status : undefined}
      >
        <InputShell error={!!(submitted && errors.status)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as MeetingStatus)
            }
          >
            {MEETING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Location">
        <InputShell icon={MapPin}>
          <input
            className={elevatedInputClass(true)}
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Office, room, or address"
          />
        </InputShell>
      </Field>
      <Field label="Meeting Link">
        <InputShell icon={Video}>
          <input
            className={elevatedInputClass(true)}
            value={form.meetingLink}
            onChange={(e) => update("meetingLink", e.target.value)}
            placeholder="https://meet.google.com/…"
          />
        </InputShell>
      </Field>
      <Field
        label="Organizer"
        required
        error={submitted ? errors.organizer : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.organizer)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.organizer}
            onChange={(e) => update("organizer", e.target.value)}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Attendees" className="sm:col-span-2 lg:col-span-3">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.attendees}
            onChange={(e) => update("attendees", e.target.value)}
            placeholder="Comma-separated names or emails"
          />
        </InputShell>
      </Field>

      <Field label="Agenda" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.agenda}
            onChange={(e) => update("agenda", e.target.value)}
            placeholder="Topics to cover…"
          />
        </TextAreaShell>
      </Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Internal notes…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
