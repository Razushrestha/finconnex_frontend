// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   Mail,
//   User,
//   Users,
//   Link2,
//   FileText,
// } from "lucide-react";
// import type { EmailStatus } from "@/lib/emails/types";
// import {
//   RELATED_ENTITY_KINDS,
//   RELATED_RECORD_OPTIONS,
//   type RelatedEntityKind,
// } from "@/lib/activities/shared";
// import {
//   CreateEntityFormShell,
//   Field,
//   InputShell,
//   TextAreaShell,
//   elevatedInputClass,
//   elevatedSelectClass,
//   elevatedTextareaClass,
// } from "@/components/sales/CreateEntityForm";

// import { createEmail } from "@/lib/emails/store";
// import { formatRulesAt } from "@/lib/rules/storage";

// interface CreateEmailFormProps {
//   layoutId: string;
//   redirect: boolean;
//   defaults?: {
//     relatedKind?: RelatedEntityKind;
//     relatedName?: string;
//     to?: string;
//   };
// }

// const EMAIL_STATUSES: EmailStatus[] = [
//   "Draft",
//   "Scheduled",
//   "Sent",
//   "Delivered",
//   "Opened",
//   "Bounced",
//   "Failed",
// ];

// const EMAIL_TEMPLATES = [
//   "Follow-up Template",
//   "Intro Template",
//   "Meeting Recap",
//   "Proposal Follow-up",
// ];

// interface FormState {
//   subject: string;
//   body: string;
//   from: string;
//   to: string;
//   cc: string;
//   bcc: string;
//   relatedKind: RelatedEntityKind | "";
//   relatedName: string;
//   template: string;
//   status: EmailStatus | "";
// }

// const initialState: FormState = {
//   subject: "",
//   body: "",
//   from: "bishnu@nepatronix.com",
//   to: "",
//   cc: "",
//   bcc: "",
//   relatedKind: "",
//   relatedName: "",
//   template: "",
//   status: "Draft",
// };

// export function CreateEmailForm({
//   layoutId,
//   redirect,
//   defaults,
// }: CreateEmailFormProps) {
//   const router = useRouter();
//   const [form, setForm] = useState<FormState>({
//     ...initialState,
//     relatedKind: defaults?.relatedKind ?? "",
//     relatedName: defaults?.relatedName ?? "",
//     to: defaults?.to ?? "",
//   });
//   const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
//     {},
//   );
//   const [submitted, setSubmitted] = useState(false);

//   function update<K extends keyof FormState>(key: K, value: FormState[K]) {
//     setForm((prev) => ({ ...prev, [key]: value }));
//   }

//   const relatedOptions = form.relatedKind
//     ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
//     : RELATED_RECORD_OPTIONS;

//   function validate() {
//     const next: Partial<Record<keyof FormState, string>> = {};
//     if (!form.subject.trim()) next.subject = "Subject is required";
//     if (!form.body.trim()) next.body = "Body is required";
//     if (!form.to.trim()) next.to = "To is required";
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   }

//   function handleSave(createAnother: boolean) {
//     setSubmitted(true);
//     if (!validate()) return;
//     const relatedTo =
//       form.relatedKind && form.relatedName
//         ? `${form.relatedKind}: ${form.relatedName}`
//         : undefined;
//     const status = (form.status || "Sent") as EmailStatus;
//     const created = createEmail({
//       subject: form.subject.trim(),
//       body: form.body.trim(),
//       from: form.from.trim(),
//       to: form.to
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean),
//       relatedTo,
//       status,
//       sentDate: status === "Draft" ? undefined : formatRulesAt(new Date()),
//       templateUsed: form.template || undefined,
//     });
//     if (createAnother) {
//       setForm({
//         ...initialState,
//         from: form.from,
//         relatedKind: form.relatedKind,
//         relatedName: form.relatedName,
//       });
//       setErrors({});
//       setSubmitted(false);
//       return;
//     }
//     void layoutId;
//     void redirect;
//     router.push(`/activities/emails?focus=${created.id}`);
//   }

//   return (
//     <CreateEntityFormShell
//       breadcrumbParent={{ label: "Emails", href: "/activities/emails" }}
//       badge="Compose email"
//       title="Create Email"
//       subtitle="Compose a message with recipients, subject, and body: then save or send later."
//       tip="Tip: Subject, body & To are required to save."
//       cardIcon={Mail}
//       cardTitle="Compose Email"
//       cardDescription="Fields marked required are needed to save (SRS §7.4)"
//       listHref="/activities/emails"
//       saveLabel="Save Email"
//       onSave={handleSave}
//     >
//       <Field
//         label="Subject"
//         required
//         error={submitted ? errors.subject : undefined}
//         className="col-span-full"
//       >
//         <InputShell icon={Mail} error={!!(submitted && errors.subject)}>
//           <input
//             className={elevatedInputClass(true)}
//             value={form.subject}
//             onChange={(e) => update("subject", e.target.value)}
//             placeholder="Email subject line"
//           />
//         </InputShell>
//       </Field>

//       <Field label="From">
//         <InputShell icon={User}>
//           <input
//             type="email"
//             className={elevatedInputClass(true)}
//             value={form.from}
//             onChange={(e) => update("from", e.target.value)}
//             placeholder="you@company.com"
//           />
//         </InputShell>
//       </Field>
//       <Field
//         label="To"
//         required
//         error={submitted ? errors.to : undefined}
//       >
//         <InputShell icon={Users} error={!!(submitted && errors.to)}>
//           <input
//             className={elevatedInputClass(true)}
//             value={form.to}
//             onChange={(e) => update("to", e.target.value)}
//             placeholder="recipient@company.com"
//           />
//         </InputShell>
//       </Field>
//       <Field label="Status">
//         <InputShell>
//           <select
//             className={elevatedSelectClass(false)}
//             value={form.status}
//             onChange={(e) => update("status", e.target.value as EmailStatus)}
//           >
//             {EMAIL_STATUSES.map((s) => (
//               <option key={s} value={s}>
//                 {s}
//               </option>
//             ))}
//           </select>
//         </InputShell>
//       </Field>

//       <Field label="CC">
//         <InputShell icon={Users}>
//           <input
//             className={elevatedInputClass(true)}
//             value={form.cc}
//             onChange={(e) => update("cc", e.target.value)}
//             placeholder="cc@company.com"
//           />
//         </InputShell>
//       </Field>
//       <Field label="BCC">
//         <InputShell icon={Users}>
//           <input
//             className={elevatedInputClass(true)}
//             value={form.bcc}
//             onChange={(e) => update("bcc", e.target.value)}
//             placeholder="bcc@company.com"
//           />
//         </InputShell>
//       </Field>
//       <Field label="Template">
//         <InputShell icon={FileText}>
//           <select
//             className={elevatedSelectClass(true)}
//             value={form.template}
//             onChange={(e) => update("template", e.target.value)}
//           >
//             <option value="">None</option>
//             {EMAIL_TEMPLATES.map((t) => (
//               <option key={t} value={t}>
//                 {t}
//               </option>
//             ))}
//           </select>
//         </InputShell>
//       </Field>

//       <Field label="Related Entity">
//         <InputShell icon={Link2}>
//           <select
//             className={elevatedSelectClass(true)}
//             value={form.relatedKind}
//             onChange={(e) => {
//               update("relatedKind", e.target.value as RelatedEntityKind | "");
//               update("relatedName", "");
//             }}
//           >
//             <option value="">None</option>
//             {RELATED_ENTITY_KINDS.map((k) => (
//               <option key={k} value={k}>
//                 {k}
//               </option>
//             ))}
//           </select>
//         </InputShell>
//       </Field>
//       <Field label="Related To" className="sm:col-span-2">
//         <InputShell>
//           <select
//             className={elevatedSelectClass(false)}
//             value={form.relatedName}
//             onChange={(e) => update("relatedName", e.target.value)}
//             disabled={!form.relatedKind}
//           >
//             <option value="">Select record</option>
//             {relatedOptions.map((r) => (
//               <option key={`${r.kind}-${r.name}`} value={r.name}>
//                 {r.name}
//               </option>
//             ))}
//           </select>
//         </InputShell>
//       </Field>

//       <Field
//         label="Body"
//         required
//         error={submitted ? errors.body : undefined}
//         className="col-span-full"
//       >
//         <TextAreaShell error={!!(submitted && errors.body)}>
//           <textarea
//             className={`${elevatedTextareaClass} min-h-[160px]`}
//             value={form.body}
//             onChange={(e) => update("body", e.target.value)}
//             placeholder="Write your email…"
//           />
//         </TextAreaShell>
//       </Field>
//     </CreateEntityFormShell>
//   );
// }

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Clock,
  FileText,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MapPin,
  Paperclip,
  Send,
  Sparkles,
  Underline,
  Users,
  X,
} from "lucide-react";
import type { EmailStatus } from "@/lib/emails/types";
import type { RelatedEntityKind } from "@/lib/activities/shared";
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

const EMAIL_TEMPLATES = [
  "Follow-up Template",
  "Intro Template",
  "Meeting Recap",
  "Proposal Follow-up",
];

const FONT_OPTIONS = ["Sans Serif", "Serif", "Monospace"] as const;
type BodyFont = (typeof FONT_OPTIONS)[number];
type BodyAlign = "left" | "center" | "right";

const FONT_FAMILY: Record<BodyFont, string> = {
  "Sans Serif": "inherit",
  Serif: "Georgia, 'Times New Roman', serif",
  Monospace: "'JetBrains Mono', ui-monospace, monospace",
};

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

// TODO: replace with a real contact-profile lookup (avatar, title, company,
// location, local time) once the API exposes one — this is illustrative
// placeholder data so the sidebar renders per the design mock.
const MOCK_CONTACT = {
  name: "Sarah Jenkins",
  title: "VP of Operations",
  company: "Acme Corp",
  location: "Seattle, WA",
  localTime: "9:42 AM",
};

// TODO: replace with a real deal lookup tied to the related record.
const MOCK_DEAL = {
  name: "Acme Q3 Enterprise",
  stage: "Negotiation",
  value: "$145,000",
  probability: 75,
};

// TODO: replace with a real activity feed for the related record.
const MOCK_ACTIVITY = [
  {
    id: "1",
    title: "Discovery Call Completed",
    when: "Yesterday, 2:30 PM",
    note: "Sarah seems very interested in the integration capabilities. Follow up with specific API docs.",
  },
  {
    id: "2",
    title: "Opened: Product One-Pager",
    when: "Oct 24, 10:15 AM",
  },
  {
    id: "3",
    title: "Initial Meeting",
    when: "Oct 18, 1:00 PM",
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const cardClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
const toolbarButtonClass =
  "rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const toolbarButtonActiveClass = "bg-accent text-accent-foreground";

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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
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

  function wrapBodySelection(before: string, after = before) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart) +
      before +
      selected +
      after +
      value.slice(selectionEnd);
    update("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length,
      );
    });
  }

  function insertLinePrefix(prefix: string) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, value } = el;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    update("body", value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => el.focus());
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

  function removeAttachment(id: string) {
    update(
      "attachments",
      form.attachments.filter((a) => a.id !== id),
    );
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
      // attachments: form.attachments — wire this up once createEmail
      // accepts file metadata; kept as local state for now.
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
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
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

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-3">
        {/* Left column */}
        <div className={`${cardClass} divide-y divide-border lg:col-span-2`}>
          {/* To */}
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-muted-foreground">To:</span>
                {form.to.map((recipient) => (
                  <span
                    key={recipient}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-2.5 pr-1.5 text-sm text-secondary-foreground"
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => removeRecipient(recipient)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={recipientDraft}
                  onChange={(e) => setRecipientDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                  onBlur={addRecipient}
                  placeholder="Add recipients…"
                  className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              {submitted && errors.to && (
                <p className="mt-1 text-xs text-destructive">{errors.to}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCcBcc((v) => !v)}
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Cc/Bcc
            </button>
          </div>

          {showCcBcc && (
            <div className="grid grid-cols-2 gap-3 px-5 py-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Cc
                </label>
          <input
                  className={inputClass + " mt-1"}
            value={form.cc}
            onChange={(e) => update("cc", e.target.value)}
            placeholder="cc@company.com"
          />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Bcc
                </label>
          <input
                  className={inputClass + " mt-1"}
            value={form.bcc}
            onChange={(e) => update("bcc", e.target.value)}
            placeholder="bcc@company.com"
          />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm text-muted-foreground">Subject:</span>
              <input
                className={
                  "flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
                }
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

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-5 py-2">
          <select
              value={form.bodyFont}
              onChange={(e) => update("bodyFont", e.target.value as BodyFont)}
              className="mr-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
              </option>
            ))}
          </select>
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              title="Bold"
              onClick={() => wrapBodySelection("**")}
              className={toolbarButtonClass}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Italic"
              onClick={() => wrapBodySelection("_")}
              className={toolbarButtonClass}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Underline"
              onClick={() => wrapBodySelection("<u>", "</u>")}
              className={toolbarButtonClass}
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              title="Align left"
              onClick={() => update("bodyAlign", "left")}
              className={
                toolbarButtonClass +
                (form.bodyAlign === "left"
                  ? ` ${toolbarButtonActiveClass}`
                  : "")
              }
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align center"
              onClick={() => update("bodyAlign", "center")}
              className={
                toolbarButtonClass +
                (form.bodyAlign === "center"
                  ? ` ${toolbarButtonActiveClass}`
                  : "")
              }
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align right"
              onClick={() => update("bodyAlign", "right")}
              className={
                toolbarButtonClass +
                (form.bodyAlign === "right"
                  ? ` ${toolbarButtonActiveClass}`
                  : "")
              }
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              title="Bullet list"
              onClick={() => insertLinePrefix("- ")}
              className={toolbarButtonClass}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Numbered list"
              onClick={() => insertLinePrefix("1. ")}
              className={toolbarButtonClass}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Link"
              onClick={() => wrapBodySelection("[", "](url)")}
              className={toolbarButtonClass}
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Attach image"
              onClick={() => fileInputRef.current?.click()}
              className={toolbarButtonClass}
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="relative px-5 py-4">
          <textarea
              ref={bodyRef}
              rows={10}
              style={{
                fontFamily: FONT_FAMILY[form.bodyFont],
                textAlign: form.bodyAlign,
              }}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Write your email…"
          />
            {submitted && errors.body && (
              <p className="mt-1 text-xs text-destructive">{errors.body}</p>
            )}
            {/* TODO: wire to an actual AI brevity-assist action */}
            <button
              type="button"
              title="Optimize for brevity — not yet wired up"
              className="absolute bottom-3 right-5 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-accent"
            >
              <Sparkles className="h-3 w-3" />
              Optimize for brevity
            </button>
          </div>

          {/* Attachments */}
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
                      onClick={() => removeAttachment(a.id)}
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
          {showContactCard && (
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
          )}

          {showContactCard && (
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
          )}

          {showContactCard && (
            <div className={`${cardClass} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Recent Activity
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:opacity-80"
                >
                  View All
                </button>
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
                      {item.note && (
                        <p className="mt-1 rounded-md bg-muted/50 px-2 py-1.5 text-[11px] italic text-muted-foreground">
                          &ldquo;{item.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showContactCard && (
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
