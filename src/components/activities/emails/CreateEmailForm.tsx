"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  Users,
  Link2,
  FileText,
} from "lucide-react";
import type { EmailStatus } from "@/lib/emails/types";
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

import { createEmail } from "@/lib/emails/store";
import { formatRulesAt } from "@/lib/rules/storage";

interface CreateEmailFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    to?: string;
  };
}

const EMAIL_STATUSES: EmailStatus[] = [
  "Draft",
  "Scheduled",
  "Sent",
  "Delivered",
  "Opened",
  "Bounced",
  "Failed",
];

const EMAIL_TEMPLATES = [
  "Follow-up Template",
  "Intro Template",
  "Meeting Recap",
  "Proposal Follow-up",
];

interface FormState {
  subject: string;
  body: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  template: string;
  status: EmailStatus | "";
}

const initialState: FormState = {
  subject: "",
  body: "",
  from: "bishnu@nepatronix.com",
  to: "",
  cc: "",
  bcc: "",
  relatedKind: "",
  relatedName: "",
  template: "",
  status: "Draft",
};

export function CreateEmailForm({
  layoutId,
  redirect,
  defaults,
}: CreateEmailFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    to: defaults?.to ?? "",
  });
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
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    if (!form.to.trim()) next.to = "To is required";
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
    const status = (form.status || "Sent") as EmailStatus;
    const created = createEmail({
      subject: form.subject.trim(),
      body: form.body.trim(),
      from: form.from.trim(),
      to: form.to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      relatedTo,
      status,
      sentDate: status === "Draft" ? undefined : formatRulesAt(new Date()),
      templateUsed: form.template || undefined,
    });
    if (createAnother) {
      setForm({
        ...initialState,
        from: form.from,
        relatedKind: form.relatedKind,
        relatedName: form.relatedName,
      });
      setErrors({});
      setSubmitted(false);
      return;
    }
    void layoutId;
    void redirect;
    router.push(`/activities/emails?focus=${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Emails", href: "/activities/emails" }}
      badge="Compose email"
      title="Create Email"
      subtitle="Compose a message with recipients, subject, and body: then save or send later."
      tip="Tip: Subject, body & To are required to save."
      cardIcon={Mail}
      cardTitle="Compose Email"
      cardDescription="Fields marked required are needed to save (SRS §7.4)"
      listHref="/activities/emails"
      saveLabel="Save Email"
      onSave={handleSave}
    >
      <Field
        label="Subject"
        required
        error={submitted ? errors.subject : undefined}
        className="col-span-full"
      >
        <InputShell icon={Mail} error={!!(submitted && errors.subject)}>
          <input
            className={elevatedInputClass(true)}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Email subject line"
          />
        </InputShell>
      </Field>

      <Field label="From">
        <InputShell icon={User}>
          <input
            type="email"
            className={elevatedInputClass(true)}
            value={form.from}
            onChange={(e) => update("from", e.target.value)}
            placeholder="you@company.com"
          />
        </InputShell>
      </Field>
      <Field
        label="To"
        required
        error={submitted ? errors.to : undefined}
      >
        <InputShell icon={Users} error={!!(submitted && errors.to)}>
          <input
            className={elevatedInputClass(true)}
            value={form.to}
            onChange={(e) => update("to", e.target.value)}
            placeholder="recipient@company.com"
          />
        </InputShell>
      </Field>
      <Field label="Status">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as EmailStatus)}
          >
            {EMAIL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="CC">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.cc}
            onChange={(e) => update("cc", e.target.value)}
            placeholder="cc@company.com"
          />
        </InputShell>
      </Field>
      <Field label="BCC">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.bcc}
            onChange={(e) => update("bcc", e.target.value)}
            placeholder="bcc@company.com"
          />
        </InputShell>
      </Field>
      <Field label="Template">
        <InputShell icon={FileText}>
          <select
            className={elevatedSelectClass(true)}
            value={form.template}
            onChange={(e) => update("template", e.target.value)}
          >
            <option value="">None</option>
            {EMAIL_TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
      <Field label="Related To" className="sm:col-span-2">
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
        label="Body"
        required
        error={submitted ? errors.body : undefined}
        className="col-span-full"
      >
        <TextAreaShell error={!!(submitted && errors.body)}>
          <textarea
            className={`${elevatedTextareaClass} min-h-[160px]`}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Write your email…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
