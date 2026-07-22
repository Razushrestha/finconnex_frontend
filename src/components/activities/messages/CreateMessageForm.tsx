"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  User,
  Users,
  Link2,
  FileText,
} from "lucide-react";
import {
  MESSAGE_OWNERS,
  MESSAGE_STATUSES,
  MESSAGE_TYPES,
  type MessageStatus,
  type MessageType,
} from "@/lib/messages/types";
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

interface CreateMessageFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  type: MessageType | "";
  subject: string;
  body: string;
  from: string;
  to: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  status: MessageStatus | "";
  template: string;
}

const MESSAGE_TEMPLATES = [
  "Document Request",
  "Intro Message",
  "Follow-up",
  "Meeting Invite",
];

const initialState: FormState = {
  type: "External",
  subject: "",
  body: "",
  from: "John Smith",
  to: "",
  relatedKind: "",
  relatedName: "",
  status: "Draft",
  template: "",
};

export function CreateMessageForm({
  layoutId,
  redirect,
}: CreateMessageFormProps) {
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
    if (!form.type) next.type = "Type is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    console.log("Saving message", { layoutId, redirect, ...form });
    if (createAnother) {
      setForm({ ...initialState, from: form.from });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/activities/messages");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Messages", href: "/activities/messages" }}
      badge="New message"
      title="Create Message"
      subtitle="Send an internal note or external message — subject and body are required."
      tip="Tip: Type, subject & body are enough to start."
      cardIcon={MessageSquare}
      cardTitle="Message Information"
      cardDescription="Fields marked required are needed to save (SRS §7.3)"
      listHref="/activities/messages"
      saveLabel="Save Message"
      onSave={handleSave}
    >
      <Field
        label="Type"
        required
        error={submitted ? errors.type : undefined}
      >
        <InputShell error={!!(submitted && errors.type)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.type}
            onChange={(e) => update("type", e.target.value as MessageType)}
          >
            {MESSAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Subject"
        required
        error={submitted ? errors.subject : undefined}
        className="sm:col-span-2"
      >
        <InputShell
          icon={MessageSquare}
          error={!!(submitted && errors.subject)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="What's this about?"
          />
        </InputShell>
      </Field>

      <Field label="From">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={form.from}
            onChange={(e) => update("from", e.target.value)}
          >
            {MESSAGE_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="To">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.to}
            onChange={(e) => update("to", e.target.value)}
            placeholder="Recipient name or email"
          />
        </InputShell>
      </Field>
      <Field label="Status">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as MessageStatus)
            }
          >
            {MESSAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
      <Field label="Template">
        <InputShell icon={FileText}>
          <select
            className={elevatedSelectClass(true)}
            value={form.template}
            onChange={(e) => {
              const value = e.target.value;
              update("template", value);
              if (value === "Document Request") {
                update(
                  "subject",
                  form.subject || "Document request — please upload",
                );
                update(
                  "body",
                  form.body ||
                    "Hi,\n\nPlease upload the requested document at your earliest convenience.\n\nThanks",
                );
              }
            }}
          >
            <option value="">None</option>
            {MESSAGE_TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      {form.template === "Document Request" ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3">
            <p className="text-[12px] text-violet-900/80">
              Prefer a trackable chase? Create a Document Request instead of a
              loose message thread.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/documents/requests/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 shrink-0 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
            >
              Open Document Request
            </button>
          </div>
        </div>
      ) : null}

      <Field
        label="Body"
        required
        error={submitted ? errors.body : undefined}
        className="sm:col-span-2 lg:col-span-3"
      >
        <TextAreaShell error={!!(submitted && errors.body)}>
          <textarea
            className={elevatedTextareaClass}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Write your message…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
