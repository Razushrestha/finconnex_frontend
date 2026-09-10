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
  type Meeting,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import {
  ACTIVITY_OWNERS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import {
  TASK_RELATED_ENTITY_KINDS,
  liveRelatedRecords,
  rankRelatedRecordsByContact,
} from "@/lib/activities/related-records";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { createMeeting } from "@/lib/meetings/store";
import { defaultActorName } from "@/lib/rules/actor";
import {
  createCrmMeeting,
  isCrmMeetingId,
  persistRemoteMeeting,
  replaceCrmMeetingAttendees,
  tryCrmMeeting,
} from "@/lib/meetings/api";
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
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
  };
}
interface FormState {
  title: string;
  contactName: string;
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
  contactName: "",
  relatedKind: "",
  relatedName: "",
  type: "Video Call",
  startDateTime: "",
  endDateTime: "",
  location: "",
  meetingLink: "",
  attendees: "",
  organizer: defaultActorName(),
  status: "Scheduled",
  agenda: "",
  notes: "",
};

export function CreateMeetingForm({
  layoutId,
  redirect,
  defaults,
}: CreateMeetingFormProps) {
  const router = useRouter();
  const relatedKindDefault =
    defaults?.relatedKind === "Lead" ||
    defaults?.relatedKind === "Deal" ||
    defaults?.relatedKind === "Company"
      ? defaults.relatedKind
      : "";
  const [form, setForm] = useState<FormState>({
    ...initialState,
    contactName:
      defaults?.relatedKind === "Contact" ? (defaults.relatedName ?? "") : "",
    relatedKind: relatedKindDefault,
    relatedName: relatedKindDefault ? (defaults?.relatedName ?? "") : "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const extra =
    form.relatedKind && form.relatedName
      ? {
          kind: form.relatedKind as RelatedEntityKind,
          name: form.relatedName,
        }
      : undefined;
  const { options: relatedRemote, loading: relatedLoading } =
    useCrmRelatedRecords(form.relatedKind, extra);
  const contactOptions = liveRelatedRecords("Contact");
  const relatedOptions = rankRelatedRecordsByContact(
    relatedRemote,
    form.contactName,
  );

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

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : form.contactName.trim()
          ? `Contact: ${form.contactName.trim()}`
          : undefined;
    const draft = {
      title: form.title.trim(),
      relatedTo,
      type: form.type as MeetingType,
      startDateTime: form.startDateTime,
      endDateTime: form.endDateTime,
      location: form.location.trim() || undefined,
      meetingLink: form.meetingLink.trim() || undefined,
      organizer: form.organizer.trim(),
      status: form.status as MeetingStatus,
      agenda: form.agenda.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    let created: Meeting | null = null;
    try {
      created = persistRemoteMeeting(await createCrmMeeting(draft));
      const attendeeIds = form.attendees
        .split(",")
        .map((part) => part.trim())
        .filter(isCrmMeetingId);
      if (created && attendeeIds.length) {
        const meetingId = created.id;
        const withAttendees = await tryCrmMeeting(() =>
          replaceCrmMeetingAttendees(meetingId, attendeeIds),
        );
        persistRemoteMeeting(withAttendees);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Create failed";
      if (!/sign in/i.test(message)) {
        setSaveError(message);
        setSaving(false);
        return;
      }
      created = null;
    }
    if (!created) {
      created = createMeeting(draft);
    }
    setSaving(false);
    if (createAnother) {
      setForm({
        ...initialState,
        organizer: form.organizer,
        relatedKind: form.relatedKind,
        relatedName: form.relatedName,
      });
      setErrors({});
      setSubmitted(false);
      setSaveError(null);
      return;
    }
    void layoutId;
    void redirect;
    router.push(`/activities/meetings/detail/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Meetings", href: "/activities/meetings" }}
      badge="New meeting"
      title="Create Meeting"
      subtitle="Schedule a call or in-person session: set time, attendees, and agenda."
      tip="Tip: Title, type, start/end, organizer & status are required."
      cardIcon={CalendarDays}
      cardTitle="Meeting Information"
      cardDescription="Fields marked required are needed to save (SRS §7.5)"
      listHref="/activities/meetings"
      saveLabel="Save Meeting"
      onSave={handleSave}
    >
      {saveError ? (
        <p className="col-span-full text-[12px] text-rose-600">{saveError}</p>
      ) : null}
      {saving ? (
        <p className="col-span-full text-[12px] text-slate-500">Saving…</p>
      ) : null}
      <Field
        label="Title"
        required
        error={submitted ? errors.title : undefined}
        className="col-span-full"
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

      <Field label="Contact Name">
        <RelatedRecordCombobox
          value={form.contactName}
          onChange={(v) => update("contactName", v)}
          options={contactOptions}
          placeholder="Search contact…"
          allowCustom
          createLabel={(name) => `Use “${name}”`}
        />
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
            {TASK_RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "Company" ? "Organization" : k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related To">
        <RelatedRecordCombobox
          value={form.relatedName}
          onChange={(v) => update("relatedName", v)}
          options={relatedOptions}
          disabled={!form.relatedKind}
          placeholder={
            relatedLoading
              ? "Loading CRM records…"
              : form.relatedKind
                ? `Search ${form.relatedKind === "Company" ? "organization" : form.relatedKind.toLowerCase()}…`
                : "Select related entity first"
          }
        />
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

      <Field label="Attendees" className="col-span-full">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.attendees}
            onChange={(e) => update("attendees", e.target.value)}
            placeholder="Comma-separated names or emails"
          />
        </InputShell>
      </Field>

      <Field label="Agenda" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.agenda}
            onChange={(e) => update("agenda", e.target.value)}
            placeholder="Topics to cover…"
          />
        </TextAreaShell>
      </Field>
      <Field label="Notes" className="col-span-full">
        <MentionNotesTextarea
          value={form.notes}
          onChange={(notes) => update("notes", notes)}
          placeholder="Internal notes… Type @ to assign someone."
        />
      </Field>
    </CreateEntityFormShell>
  );
}
