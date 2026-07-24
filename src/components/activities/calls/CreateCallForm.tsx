"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  User,
  Calendar,
  Clock,
  Link2,
  Users,
} from "lucide-react";
import {
  CALL_OWNERS,
  CALL_STATUSES,
  CALL_TYPES,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import { createCall } from "@/lib/calls/store";
import {
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

interface CreateCallFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    contact?: string;
  };
}

interface FormState {
  subject: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  contact: string;
  callType: CallType | "";
  status: CallStatus | "";
  date: string;
  duration: string;
  notes: string;
  assignedTo: string;
}

const initialState: FormState = {
  subject: "",
  relatedKind: "",
  relatedName: "",
  contact: "",
  callType: "Outbound",
  status: "Scheduled",
  date: "",
  duration: "",
  notes: "",
  assignedTo: "John Smith",
};

export function CreateCallForm({
  layoutId,
  redirect,
  defaults,
}: CreateCallFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    contact: defaults?.contact ?? defaults?.relatedName ?? "",
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
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.callType) next.callType = "Call type is required";
    if (!form.status) next.status = "Status is required";
    if (!form.date) next.date = "Date is required";
    if (!form.assignedTo.trim()) next.assignedTo = "Assigned to is required";
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
      contact: form.contact.trim() || undefined,
      callType: form.callType as CallType,
      status: form.status as CallStatus,
      date: form.date,
      duration: form.duration.trim() || undefined,
      notes: form.notes.trim() || undefined,
      assignedTo: form.assignedTo.trim(),
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
      badge="New call"
      title="Create Call"
      subtitle="Log an inbound or outbound conversation: capture type, timing, and outcome."
      tip="Tip: Subject, call type, status, date & assignee are required."
      cardIcon={Phone}
      cardTitle="Call Information"
      cardDescription="Fields marked required are needed to save (SRS §7.2)"
      listHref="/activities/calls"
      saveLabel="Save Call"
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
            placeholder="e.g. Discovery call: Anderson Finance"
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
      <Field label="Contact">
        <InputShell icon={User}>
          <input
            className={elevatedInputClass(true)}
            value={form.contact}
            onChange={(e) => update("contact", e.target.value)}
            placeholder="Who did you speak with?"
          />
        </InputShell>
      </Field>

      <Field
        label="Call Type"
        required
        error={submitted ? errors.callType : undefined}
      >
        <InputShell error={!!(submitted && errors.callType)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.callType}
            onChange={(e) => update("callType", e.target.value as CallType)}
          >
            {CALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
            onChange={(e) => update("status", e.target.value as CallStatus)}
          >
            {CALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Date"
        required
        error={submitted ? errors.date : undefined}
      >
        <InputShell icon={Calendar} error={!!(submitted && errors.date)}>
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Duration">
        <InputShell icon={Clock}>
          <input
            className={elevatedInputClass(true)}
            value={form.duration}
            onChange={(e) => update("duration", e.target.value)}
            placeholder="e.g. 18 min"
          />
        </InputShell>
      </Field>
      <Field
        label="Assigned To"
        required
        error={submitted ? errors.assignedTo : undefined}
      >
        <InputShell icon={Users} error={!!(submitted && errors.assignedTo)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.assignedTo}
            onChange={(e) => update("assignedTo", e.target.value)}
          >
            {CALL_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Notes" className="col-span-full">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Call summary, next steps…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
