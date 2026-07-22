"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, Link2, BellRing } from "lucide-react";
import {
  NOTIFICATION_METHODS,
  REMINDER_STATUSES,
  REMINDER_TYPES,
  type NotificationMethod,
  type ReminderStatus,
  type ReminderType,
} from "@/lib/reminders/types";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface CreateReminderFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  title: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  dateTime: string;
  type: ReminderType | "";
  status: ReminderStatus | "";
  notificationMethod: NotificationMethod | "";
}

const initialState: FormState = {
  title: "",
  relatedKind: "",
  relatedName: "",
  dateTime: "",
  type: "Follow-up",
  status: "Pending",
  notificationMethod: "In-app",
};

export function CreateReminderForm({
  layoutId,
  redirect,
}: CreateReminderFormProps) {
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
    if (!form.dateTime) next.dateTime = "Date/Time is required";
    if (!form.type) next.type = "Type is required";
    if (!form.notificationMethod) {
      next.notificationMethod = "Notification method is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    console.log("Saving reminder", { layoutId, redirect, ...form });
    if (createAnother) {
      setForm(initialState);
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/activities/reminders");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Reminders", href: "/activities/reminders" }}
      badge="New reminder"
      title="Create Reminder"
      subtitle="Never miss a follow-up — set when and how you want to be notified."
      tip="Tip: Title, date/time, type & notification method are required."
      cardIcon={Bell}
      cardTitle="Reminder Information"
      cardDescription="Fields marked required are needed to save (SRS §7.7)"
      listHref="/activities/reminders"
      saveLabel="Save Reminder"
      onSave={handleSave}
    >
      <Field
        label="Title"
        required
        error={submitted ? errors.title : undefined}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={Bell} error={!!(submitted && errors.title)}>
          <input
            className={elevatedInputClass(true)}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="What should we remind you about?"
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
        label="Date / Time"
        required
        error={submitted ? errors.dateTime : undefined}
      >
        <InputShell
          icon={Calendar}
          error={!!(submitted && errors.dateTime)}
        >
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.dateTime}
            onChange={(e) => update("dateTime", e.target.value)}
          />
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
            onChange={(e) => update("type", e.target.value as ReminderType)}
          >
            {REMINDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Status">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as ReminderStatus)
            }
          >
            {REMINDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Notification Method"
        required
        error={submitted ? errors.notificationMethod : undefined}
      >
        <InputShell
          icon={BellRing}
          error={!!(submitted && errors.notificationMethod)}
        >
          <select
            className={elevatedSelectClass(true)}
            value={form.notificationMethod}
            onChange={(e) =>
              update(
                "notificationMethod",
                e.target.value as NotificationMethod,
              )
            }
          >
            {NOTIFICATION_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
    </CreateEntityFormShell>
  );
}
