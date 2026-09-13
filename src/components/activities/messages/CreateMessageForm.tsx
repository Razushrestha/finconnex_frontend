"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  User,
  Users,
  Link2,
  FileText,
} from "lucide-react";
import {
  MESSAGE_STATUSES,
  MESSAGE_TYPES,
  type MessageStatus,
  type MessageType,
} from "@/lib/messages/types";
import {
  RELATED_ENTITY_KINDS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

import {
  createCrmMessage,
  isCrmMessageId,
  persistRemoteMessage,
  sendCrmMessage,
} from "@/lib/messages/api";
import {
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { listCrmContacts } from "@/lib/contacts/api";
import { formatRulesAt } from "@/lib/rules/storage";
import { defaultActorName } from "@/lib/rules/actor";

interface CreateMessageFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    relatedId?: string;
    to?: string;
  };
}

interface FormState {
  type: MessageType | "";
  subject: string;
  body: string;
  from: string;
  to: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  relatedId: string;
  status: MessageStatus | "";
  template: string;
  /**
   * The contact the message is addressed to. An external message carries a
   * contact id, not a phone number — CreateMessageDto declares
   * `@ValidateIf(EXTERNAL) @IsUUID() toContactId`, so leaving it unset made
   * every external send fail validation with a bare 400.
   */
  toContactId: string;
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
  from: defaultActorName(),
  to: "",
  relatedKind: "",
  relatedName: "",
  relatedId: "",
  status: "Draft",
  template: "",
  toContactId: "",
};

export function CreateMessageForm({
  layoutId,
  redirect,
  defaults,
}: CreateMessageFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
    relatedId: defaults?.relatedId ?? "",
    to: defaults?.to ?? defaults?.relatedName ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  /**
   * Real workspace members. This used to render MESSAGE_OWNERS, which is
   * ACTIVITY_OWNERS, which is an empty array since the demo names were
   * stripped — so the From select had no options at all.
   */
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const [contacts, setContacts] = useState<
    { id: string; name: string; phone: string }[]
  >([]);
  const [contactsState, setContactsState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners()
      .then((rows) => {
        if (!cancelled && rows.length) setOwners(rows);
      })
      .catch(() => {
        /* keep whatever the local directory already gave us */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listCrmContacts({ limit: 100 })
      .then((rows) => {
        if (cancelled) return;
        setContacts(
          rows
            .map(({ contact }) => ({
              id: contact.id,
              name: contact.name || contact.email || "Untitled contact",
              phone: contact.phone ?? "",
            }))
            .filter((row) => isUuid(row.id)),
        );
        setContactsState("ready");
      })
      .catch(() => {
        if (!cancelled) setContactsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const extra =
    form.relatedKind && form.relatedName
      ? { kind: form.relatedKind, name: form.relatedName }
      : undefined;
  const { options: relatedOptions, loading: relatedLoading } =
    useCrmRelatedRecords(form.relatedKind, extra);

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.type) next.type = "Type is required";
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    // The API rejects an external message without a contact, so catch it here
    // rather than surfacing the server's unlabelled 400.
    if (form.type === "External" && !isUuid(form.toContactId)) {
      next.toContactId = "Pick the contact this message goes to";
    }
    if (form.relatedKind && !isUuid(form.relatedId)) {
      next.relatedName = "Pick a live CRM record";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    setSendError(null);
    if (!validate()) return;
    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;
    const status = (form.status || "Draft") as MessageStatus;
    try {
      const remote = persistRemoteMessage(
        await createCrmMessage({
          type: form.type as MessageType,
          subject: form.subject.trim(),
          body: form.body.trim(),
          to: form.to || undefined,
          toContactId: form.toContactId || undefined,
          relatedTo,
          relatedType: form.relatedKind
            ? form.relatedKind.toUpperCase()
            : undefined,
          relatedId: form.relatedId,
          channel: form.type === "Internal" ? undefined : "SMS",
          send: false,
        }),
      );
      if (!remote || !isCrmMessageId(remote.id)) {
        throw new Error("CRM did not save the message");
      }
      let createdId = remote.id;
      if (status !== "Draft" && status !== "Failed") {
        const sent = persistRemoteMessage(await sendCrmMessage(remote.id));
        if (!sent && status === "Sent") {
          setSendError(
            "CRM created the draft but send failed. Open the message to retry.",
          );
          router.push(`/activities/messages?focus=${remote.id}`);
          return;
        }
        persistRemoteMessage(
          sent ?? { ...remote, status, sentDate: formatRulesAt(new Date()) },
        );
        createdId = sent?.id ?? remote.id;
      }

      if (createAnother) {
        setForm({
          ...initialState,
          from: form.from,
          relatedKind: form.relatedKind,
          relatedName: form.relatedName,
          relatedId: form.relatedId,
        });
        setErrors({});
        setSubmitted(false);
        return;
      }
      void layoutId;
      void redirect;
      router.push(`/activities/messages?focus=${createdId}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not save message");
    }
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Messages", href: "/activities/messages" }}
      badge="New message"
      title="Create Message"
      subtitle="Send an internal note or external message: subject and body are required."
      tip="Tip: Type, subject & body are enough to start."
      cardIcon={MessageSquare}
      cardTitle="Message Information"
      cardDescription="Fields marked required are needed to save (SRS §7.3)"
      listHref="/activities/messages"
      saveLabel="Save Message"
      onSave={handleSave}
    >
      {sendError ? (
        <p className="col-span-full rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {sendError}
        </p>
      ) : null}
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
            <option value="">Select a teammate...</option>
            {owners.map((o) => (
              <option key={o.id} value={o.name || o.email}>
                {o.name || o.email}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      {/*
        An external message is addressed to a contact, not to a typed number:
        the API takes `toContactId` and resolves the phone itself. A free-text
        box here produced a message the backend rejected with a bare 400.
      */}
      <Field label="To" error={submitted ? errors.toContactId : undefined}>
        <InputShell icon={Users}>
          <select
            className={elevatedSelectClass(true)}
            value={form.toContactId}
            onChange={(e) => {
              const contact = contacts.find((c) => c.id === e.target.value);
              setForm((prev) => ({
                ...prev,
                toContactId: e.target.value,
                to: contact?.phone || contact?.name || "",
              }));
            }}
            disabled={form.type === "Internal"}
          >
            <option value="">
              {contactsState === "loading"
                ? "Loading contacts..."
                : contactsState === "error"
                  ? "Could not load contacts"
                  : contacts.length === 0
                    ? "No contacts yet — add one first"
                    : "Select a contact..."}
            </option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` — ${c.phone}` : ""}
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
              update("relatedId", "");
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
      <Field
        label="Related To"
        error={submitted ? errors.relatedName : undefined}
      >
        <RelatedRecordCombobox
          value={form.relatedName}
          onChange={(name) => update("relatedName", name)}
          onSelectOption={(option) => update("relatedId", option?.id ?? "")}
          options={relatedOptions}
          disabled={!form.relatedKind}
          placeholder={
            relatedLoading
              ? "Loading CRM records…"
              : form.relatedKind
                ? "Search record…"
                : "Select related entity first"
          }
        />
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
                  form.subject || "Document request: please upload",
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
        <div className="col-span-full">
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
        className="col-span-full"
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
