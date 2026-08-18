"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, User, Calendar, Link2, Users, Bell, Hash } from "lucide-react";
import { CALL_OWNERS, type CallType } from "@/lib/calls/types";
import { createCall, formatCallDate } from "@/lib/calls/store";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import {
  createTaskReminder,
  type TaskReminder,
} from "@/lib/tasks/types";
import {
  REMINDER_LEAD_TIMES,
  type ReminderLeadTime,
} from "@/lib/reminders/types";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

const SCHEDULE_CALL_TYPES: CallType[] = ["Outbound", "Inbound"];

const CALL_PURPOSES = [
  "Prospecting",
  "Administrative",
  "Negotiation",
  "Demo",
  "Project",
  "Support",
  "Follow-up",
] as const;

const CALL_FOR_OPTIONS = RELATED_RECORD_OPTIONS.filter(
  (r) => r.kind === "Lead" || r.kind === "Contact",
);

interface ScheduleCallFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    contact?: string;
  };
}

interface FormState {
  callFor: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  fromNumber: string;
  callType: CallType;
  startTime: string;
  assignedTo: string;
  subject: string;
  reminderLeadTime: ReminderLeadTime | "";
  purpose: string;
  agenda: string;
}

const initialState: FormState = {
  callFor: "",
  relatedKind: "",
  relatedName: "",
  fromNumber: "",
  callType: "Outbound",
  startTime: "",
  assignedTo: "John Smith",
  subject: "",
  reminderLeadTime: "15 minutes before",
  purpose: "Follow-up",
  agenda: "",
};

function toStoredDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatCallDate(parsed);
}

function reminderFromStart(
  startTime: string,
  leadTime: ReminderLeadTime | "",
): TaskReminder[] {
  if (!startTime || !leadTime) return [];
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return [];

  const minutes = leadTime.includes("day")
    ? 24 * 60
    : leadTime.includes("hour")
      ? 60
      : Number.parseInt(leadTime, 10) || 15;
  const when = new Date(start.getTime() - minutes * 60_000);
  const year = when.getFullYear();
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  const hours = String(when.getHours()).padStart(2, "0");
  const mins = String(when.getMinutes()).padStart(2, "0");

  return [
    createTaskReminder({
      type: "Follow-up",
      date: `${year}-${month}-${day}`,
      time: `${hours}:${mins}`,
      leadTime,
      scheduleMode: "relative",
      relativeCount: leadTime.includes("day") ? 1 : minutes,
      relativeWhen: "Before",
      notify: "Both",
    }),
  ];
}

export function ScheduleCallForm({
  layoutId,
  redirect,
  defaults,
}: ScheduleCallFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    callFor: defaults?.contact ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = (() => {
    const base = form.relatedKind
      ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
      : RELATED_RECORD_OPTIONS;
    if (
      form.relatedKind &&
      form.relatedName &&
      !base.some((r) => r.name === form.relatedName)
    ) {
      return [
        ...base,
        { kind: form.relatedKind as RelatedEntityKind, name: form.relatedName },
      ];
    }
    return base;
  })();

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.callFor.trim()) next.callFor = "Call to is required";
    if (!form.callType) next.callType = "Call type is required";
    if (!form.startTime) next.startTime = "Call start time is required";
    if (!form.assignedTo.trim()) next.assignedTo = "Call owner is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;

    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;

    const created = createCall({
      subject: form.subject.trim(),
      relatedTo,
      contact: form.callFor.trim() || undefined,
      callFor: form.callFor.trim() || undefined,
      fromNumber: form.fromNumber.trim() || undefined,
      callType: form.callType,
      status: "Scheduled",
      date: toStoredDate(form.startTime),
      assignedTo: form.assignedTo.trim(),
      agenda: form.agenda.trim() || undefined,
      purpose: form.purpose.trim() || undefined,
      notes: form.agenda.trim() || undefined,
      reminders: reminderFromStart(form.startTime, form.reminderLeadTime),
    });

    if (createAnother) {
      setForm({
        ...initialState,
        assignedTo: form.assignedTo,
        relatedKind: form.relatedKind,
        relatedName: form.relatedName,
      });
      setErrors({});
      setSubmitted(false);
      return;
    }

    void layoutId;
    void redirect;
    router.push(`/activities/calls?focus=${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Calls", href: "/activities/calls" }}
      badge="Schedule call"
      title="Schedule a Call"
      subtitle="Set who you are calling, when it happens, and what to cover."
      tip="Tip: Call to, start time, owner and subject are required."
      cardIcon={Phone}
      cardTitle="Call Information"
      cardDescription="Schedule an outbound or inbound call"
      listHref="/activities/calls"
      saveLabel="Schedule Call"
      onSave={handleSave}
    >
      <Field
        label="Subject"
        required
        error={submitted ? errors.subject : undefined}
        className="col-span-full"
      >
        <InputShell icon={Phone} error={!!(submitted && errors.subject)}>
          <input
            className={elevatedInputClass(true)}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="e.g. Follow-up call: Anderson Finance"
          />
        </InputShell>
      </Field>

      <Field
        label="Call To"
        required
        error={submitted ? errors.callFor : undefined}
      >
        <RelatedRecordCombobox
          value={form.callFor}
          onChange={(v) => update("callFor", v)}
          options={CALL_FOR_OPTIONS}
          placeholder="Select lead or contact…"
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
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
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
          placeholder="Select record…"
        />
      </Field>

      <Field
        label="Call Type"
        required
        error={submitted ? errors.callType : undefined}
      >
        <div className="inline-flex h-10 w-full rounded-lg border border-slate-200 bg-slate-100 p-1">
          {SCHEDULE_CALL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update("callType", type)}
              className={cn(
                "flex-1 rounded-md text-[13px] font-medium transition-all",
                form.callType === type
                  ? "bg-white text-[#5A32A3] shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Call Start Time"
        required
        error={submitted ? errors.startTime : undefined}
      >
        <InputShell icon={Calendar} error={!!(submitted && errors.startTime)}>
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
          />
        </InputShell>
      </Field>

      <Field
        label="Call Owner"
        required
        error={submitted ? errors.assignedTo : undefined}
      >
        <InputShell icon={Users} error={!!(submitted && errors.assignedTo)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.assignedTo}
            onChange={(e) => update("assignedTo", e.target.value)}
          >
            {CALL_OWNERS.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="From Number">
        <InputShell icon={Hash}>
          <input
            type="tel"
            className={elevatedInputClass(true)}
            value={form.fromNumber}
            onChange={(e) => update("fromNumber", e.target.value)}
            placeholder="e.g. +1 415 555 0198"
          />
        </InputShell>
      </Field>

      <Field label="Reminder">
        <InputShell icon={Bell}>
          <select
            className={elevatedSelectClass(true)}
            value={form.reminderLeadTime}
            onChange={(e) =>
              update(
                "reminderLeadTime",
                e.target.value as ReminderLeadTime | "",
              )
            }
          >
            <option value="">None</option>
            {REMINDER_LEAD_TIMES.map((lead) => (
              <option key={lead} value={lead}>
                {lead}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Purpose of outgoing call">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={form.purpose}
            onChange={(e) => update("purpose", e.target.value)}
          >
            <option value="">Select purpose</option>
            {CALL_PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Call agenda" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.agenda}
            onChange={(e) => update("agenda", e.target.value)}
            placeholder="What should be covered on this call?"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
