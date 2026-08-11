"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Paperclip,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { EmailStatus } from "@/lib/emails/types";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import { createEmail } from "@/lib/emails/store";
import { formatRulesAt } from "@/lib/rules/storage";
import { EmailEditor } from "./EmailEditor";
import { EmailRecipients } from "./EmailRecipients";

interface CreateEmailFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    to?: string;
  };
}

const EMAIL_TEMPLATES = [
  "Follow-up Template",
  "Intro Template",
  "Meeting Recap",
  "Proposal Follow-up",
];

type BodyFont = "Sans Serif" | "Serif" | "Monospace";
type BodyAlign = "left" | "center" | "right";

interface Attachment {
  id: string;
  name: string;
  size: number;
}

interface FormState {
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc: string;
  bcc: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  template: string;
  attachments: Attachment[];
  bodyFont: BodyFont;
  bodyAlign: BodyAlign;
}

const initialState: FormState = {
  subject: "",
  body: "",
  from: "bishnu@nepatronix.com",
  to: [],
  cc: "",
  bcc: "",
  relatedKind: "",
  relatedName: "",
  template: "",
  attachments: [],
  bodyFont: "Sans Serif",
  bodyAlign: "left",
};

const MOCK_CONTACT = {
  name: "Sarah Jenkins",
  title: "VP of Operations",
  company: "Acme Corp",
  location: "Seattle, WA",
  localTime: "9:42 AM",
};
const MOCK_DEAL = {
  name: "Acme Q3 Enterprise",
  stage: "Negotiation",
  value: "$145,000",
  probability: 75,
};
const MOCK_ACTIVITY = [
  {
    id: "1",
    title: "Discovery Call Completed",
    when: "Yesterday, 2:30 PM",
    note: "Sarah seems very interested.",
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const cardClass =
  "rounded-md border border-border bg-card text-card-foreground shadow-sm";

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
    to: defaults?.to ? [defaults.to] : [],
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [recipientDraft, setRecipientDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    if (form.to.length === 0) next.to = "At least one recipient is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addRecipient() {
    const value = recipientDraft.trim();
    if (!value || form.to.includes(value)) return;
    update("to", [...form.to, value]);
    setRecipientDraft("");
  }

  function removeRecipient(value: string) {
    update(
      "to",
      form.to.filter((r) => r !== value),
    );
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Attachment[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
    }));
    update("attachments", [...form.attachments, ...next]);
  }

  function save(status: EmailStatus) {
    setSubmitted(true);
    if (!validate()) return;
    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;
    const created = createEmail({
      subject: form.subject.trim(),
      body: form.body.trim(),
      from: form.from.trim(),
      to: form.to,
      relatedTo,
      status,
      sentDate: status === "Draft" ? undefined : formatRulesAt(new Date()),
      templateUsed: form.template || undefined,
    });
    void layoutId;
    void redirect;
    router.push(`/activities/emails?focus=${created.id}`);
  }

  const showContactCard =
    Boolean(form.relatedName) || Boolean(defaults?.relatedName);
  const contactName = form.relatedName || MOCK_CONTACT.name;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/activities/emails")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground">
            Compose Email
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save("Draft")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => save("Sent")}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Send Email
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full grid-cols-1 gap-6 px-6 py-4 lg:grid-cols-3">
        {/* Left column */}
        <div className={`${cardClass} divide-y divide-border lg:col-span-2`}>
          <EmailRecipients
            to={form.to}
            recipientDraft={recipientDraft}
            onDraftChange={setRecipientDraft}
            onAddRecipient={addRecipient}
            onRemoveRecipient={removeRecipient}
            showCcBcc={showCcBcc}
            onToggleCcBcc={() => setShowCcBcc((v) => !v)}
            cc={form.cc}
            bcc={form.bcc}
            onCcChange={(val) => update("cc", val)}
            onBccChange={(val) => update("bcc", val)}
            error={errors.to}
            submitted={submitted}
          />

          {/* Subject Line */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm text-muted-foreground">Subject:</span>
              <input
                className="flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="Email subject line"
              />
            </div>
            <div className="relative flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{form.template || "Templates"}</span>
              <select
                value={form.template}
                onChange={(e) => update("template", e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                <option value="">Templates</option>
                {EMAIL_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {submitted && errors.subject && (
            <p className="px-5 pb-2 text-xs text-destructive">
              {errors.subject}
            </p>
          )}

          {/* Editor Component */}
          <EmailEditor
            body={form.body}
            onChange={(val) => update("body", val)}
            bodyFont={form.bodyFont}
            onFontChange={(font) => update("bodyFont", font)}
            bodyAlign={form.bodyAlign}
            onAlignChange={(align) => update("bodyAlign", align)}
            onAttachImage={() => fileInputRef.current?.click()}
            error={errors.body}
            submitted={submitted}
          />

          {/* Attachments Section */}
          <div className="px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Attachments ({form.attachments.length})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
              >
                + Add File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>
            {form.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="group flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Paperclip className="h-4 w-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-medium text-foreground">
                        {a.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(a.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "attachments",
                          form.attachments.filter((item) => item.id !== a.id),
                        )
                      }
                      className="ml-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — contextual sidebar */}
        <div className="space-y-6">
          {showContactCard ? (
            <>
              <div className={`${cardClass} p-4`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {contactName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {contactName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {MOCK_CONTACT.title}, {MOCK_CONTACT.company}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {MOCK_CONTACT.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {MOCK_CONTACT.localTime} (Local)
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4`}>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Active Deal Context
                </p>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {MOCK_DEAL.name}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {MOCK_DEAL.stage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-muted-foreground">Value</p>
                      <p className="font-medium text-primary">
                        {MOCK_DEAL.value}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Probability</p>
                      <p className="font-medium text-foreground">
                        {MOCK_DEAL.probability}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Recent Activity
                  </p>
                </div>
                <div className="space-y-3">
                  {MOCK_ACTIVITY.map((item) => (
                    <div key={item.id} className="flex gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.when}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={`${cardClass} p-4 text-sm text-muted-foreground`}>
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4" />
                No related record
              </div>
              Link this email to a contact or deal to see their profile, active
              deal, and recent activity here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
