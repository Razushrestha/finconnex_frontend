"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  LayoutTemplate,
  Search,
} from "lucide-react";
import type { EmailImportance, EmailStatus } from "@/lib/emails/types";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import {
  applyCrmEmailTemplate,
  createCrmEmail,
  persistRemoteEmail,
  sendCrmEmail,
  tryCrmEmail,
} from "@/lib/emails/api";
import { attachFilesToCrmEmail, prepareEmailPayload } from "@/lib/emails/attach-files";
import { isUuid } from "@/lib/activity-timeline/auth";
import { createEmail, deleteEmail, upsertEmail } from "@/lib/emails/store";
import { takeCompose } from "@/lib/emails/outlook";
import { htmlToPlainText, type EmailTone } from "@/lib/emails/ai-compose";
import { requestEmailAi } from "@/lib/emails/request-email-ai";
import {
  filledTemplateSubject,
  renderEmailTemplateHtml,
  searchEmailTemplates,
  type EmailTemplate,
} from "@/lib/emails/templates";
import {
  appendSignature,
  applyPersonaSignature,
  getActiveSignatureProfile,
  getSignatureProfileForEmail,
  hasAnySignature,
  listSignatureProfiles,
  setActiveSignatureId,
  stripAllSignatures,
  stripSignature,
} from "@/lib/emails/signature";
import { listFromIdentities, loadFromIdentities, sendAsLabel } from "@/lib/emails/send-as";
import { formatRulesAt, onRulesChange } from "@/lib/rules/storage";
import {
  invalidEmailMessage,
  partitionEmailAddresses,
} from "@/lib/emails/address";
import { ComposeContextRail } from "./ComposeContextRail";
import { ComposeActionBar } from "./ComposeActionBar";
import { EmailEditor } from "./EmailEditor";
import { EmailRecipients } from "./EmailRecipients";
import { EditWithAiModal } from "./EditWithAiModal";
import { SubjectImproveButton } from "./SubjectImproveButton";

interface CreateEmailFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    relatedId?: string;
    to?: string;
    cc?: string;
    subject?: string;
    body?: string;
    template?: string;
  };
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  file?: File;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FormState {
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  relatedId: string;
  template: string;
  attachments: Attachment[];
  importance: EmailImportance;
}

const initialState: FormState = {
  subject: "",
  body: "",
  from: "",
  to: [],
  cc: [],
  bcc: [],
  relatedKind: "",
  relatedName: "",
  relatedId: "",
  template: "",
  attachments: [],
  importance: "normal",
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
    relatedId: defaults?.relatedId ?? "",
    to: partitionEmailAddresses(defaults?.to ?? "").valid,
    cc: partitionEmailAddresses(defaults?.cc ?? "").valid,
    subject: defaults?.subject ?? "",
    body: defaults?.body ?? "",
    template: defaults?.template ?? "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [showCc, setShowCc] = useState(() => Boolean(defaults?.cc));

  useEffect(() => {
    const draft = takeCompose();
    let draftApplied = false;
    let cancelled = false;
    function applyMailbox(identities = listFromIdentities()) {
      const fromEmail = identities[0]?.email ?? "";
      const profile = fromEmail
        ? getSignatureProfileForEmail(fromEmail)
        : undefined;
      if (profile) setActiveSignatureId(profile.id);
      if (draft?.cc?.length) setShowCc(true);
      setForm((prev) => {
        const merged =
          !draftApplied && draft
            ? {
                ...prev,
                to: draft.to.length ? draft.to : prev.to,
                cc: draft.cc?.length ? draft.cc : prev.cc,
                subject: draft.subject || prev.subject,
                body: draft.body || prev.body,
                relatedName: draft.relatedName || prev.relatedName,
                template: draft.templateUsed || prev.template,
              }
            : prev;
        draftApplied = true;
        const nextFrom = fromEmail || prev.from;
        const shouldSign =
          Boolean(profile) &&
          nextFrom === fromEmail &&
          !hasAnySignature(merged.body);
        return {
          ...merged,
          from: nextFrom,
          body: shouldSign
            ? appendSignature(merged.body, profile!.body)
            : merged.body,
        };
      });
    }
    applyMailbox();
    void loadFromIdentities()
      .then((identities) => {
        if (cancelled) return;
        setFromIdentities(identities);
        setFromLoading(false);
        applyMailbox(identities);
      })
      .catch(() => {
        if (!cancelled) setFromLoading(false);
      });
    const off = onRulesChange((kind) => {
      if (kind === "actor" || kind === "all") {
        const identities = listFromIdentities();
        setFromIdentities(identities);
        applyMailbox(identities);
      }
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  const [showBcc, setShowBcc] = useState(false);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [ccDraft, setCcDraft] = useState("");
  const [bccDraft, setBccDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [improving, setImproving] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [fromOpen, setFromOpen] = useState(false);
  const [fromIdentities, setFromIdentities] = useState(() => listFromIdentities());
  const [fromLoading, setFromLoading] = useState(() => listFromIdentities().length === 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const aiSeq = useRef(0);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const canPickFrom = fromIdentities.length > 1;
  const fromIdentity =
    fromIdentities.find((item) => item.email === form.from) ?? fromIdentities[0];
  const fromLabel = form.from
    ? fromIdentity
      ? `${fromIdentity.name} <${fromIdentity.email}>`
      : form.from
    : fromLoading
      ? "Loading mailbox…"
      : "Workspace mailbox not configured";

  useEffect(() => {
    if (!templatesOpen && !fromOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (templatesOpen && !templatesRef.current?.contains(target)) {
        setTemplatesOpen(false);
      }
      if (fromOpen && !fromRef.current?.contains(target)) {
        setFromOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setTemplatesOpen(false);
      setFromOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [templatesOpen, fromOpen]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addToList(
    key: "to" | "cc" | "bcc",
    raw: string,
    setDraft: (value: string) => void,
  ) {
    if (!raw.trim()) return;
    const { valid, invalid } = partitionEmailAddresses(raw);
    if (valid.length) {
      const existing = new Set(form[key].map((item) => item.toLowerCase()));
      const additions = valid.filter((item) => !existing.has(item.toLowerCase()));
      if (additions.length) {
        update(key, [...form[key], ...additions]);
      }
    }
    if (invalid.length) {
      setDraft(invalid.join(", "));
      setErrors((prev) => ({
        ...prev,
        [key]: invalidEmailMessage(invalid),
      }));
      return;
    }
    setDraft("");
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addRecipient() {
    addToList("to", recipientDraft, setRecipientDraft);
  }

  function removeRecipient(value: string) {
    update(
      "to",
      form.to.filter((r) => r !== value),
    );
  }

  function addCc() {
    addToList("cc", ccDraft, setCcDraft);
  }

  function removeCc(value: string) {
    update(
      "cc",
      form.cc.filter((r) => r !== value),
    );
  }

  function addBcc() {
    addToList("bcc", bccDraft, setBccDraft);
  }

  function removeBcc(value: string) {
    update(
      "bcc",
      form.bcc.filter((r) => r !== value),
    );
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Attachment[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      file: f,
    }));
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...next],
    }));
  }

  function mergeList(list: string[], draft: string) {
    return partitionEmailAddresses([...list, draft]);
  }

  async function save(
    status: EmailStatus,
    after: "emails" | "follow-up" | "deal" = "emails",
    at?: Date,
  ) {
    setSubmitted(true);
    setSendError(null);
    const toParts = mergeList(form.to, recipientDraft);
    const ccParts = mergeList(form.cc, ccDraft);
    const bccParts = mergeList(form.bcc, bccDraft);
    const to = toParts.valid;
    const cc = ccParts.valid;
    const bcc = bccParts.valid;
    setForm((prev) => ({ ...prev, to, cc, bcc }));
    setRecipientDraft(toParts.invalid.join(", "));
    setCcDraft(ccParts.invalid.join(", "));
    setBccDraft(bccParts.invalid.join(", "));

    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    if (toParts.invalid.length) next.to = invalidEmailMessage(toParts.invalid);
    else if (to.length === 0) next.to = "At least one recipient is required";
    if (ccParts.invalid.length) next.cc = invalidEmailMessage(ccParts.invalid);
    if (bccParts.invalid.length) next.bcc = invalidEmailMessage(bccParts.invalid);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setSending(false);
      setSendError(
        next.to ||
          next.cc ||
          next.bcc ||
          "Fix the highlighted fields before sending.",
      );
      return;
    }

    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;

    setSending(true);
    const local = createEmail({
      subject: form.subject.trim(),
      body: form.body.trim(),
      from: form.from.trim(),
      to,
      cc,
      bcc,
      relatedTo,
      relatedType: form.relatedKind ? form.relatedKind.toUpperCase() : undefined,
      relatedId: form.relatedId || undefined,
      status,
      sentDate: status === "Draft" ? undefined : formatRulesAt(at ?? new Date()),
      templateUsed: form.template || undefined,
      importance: form.importance,
      attachments: form.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        sizeLabel: formatBytes(a.size),
      })),
    });
    let keptId = local.id;

    try {
      const remote = await createCrmEmail({
        subject: form.subject.trim(),
        body: form.body.trim(),
        from: form.from.trim(),
        to,
        cc,
        bcc,
          relatedType: form.relatedKind ? form.relatedKind.toUpperCase() : undefined,
          relatedId: form.relatedId || undefined,
          relatedTo,
        status: "Draft",
        template: form.template || undefined,
      });

      if (!remote) {
        upsertEmail({ ...local, status: "Draft" });
        setSending(false);
        setSendError("CRM did not create the draft. Check the recipient and try again.");
        return;
      }

      deleteEmail(local.id);
      let current = persistRemoteEmail({
        ...local,
        ...remote,
        id: remote.id,
        status,
        sentDate: local.sentDate,
        outbound: status !== "Draft",
      }) ?? remote;
      keptId = current.id;
      const blobs = form.attachments
        .map((item) => item.file)
        .filter((item): item is File => item instanceof File);
      const prepared = await prepareEmailPayload({
        html: form.body.trim(),
        files: blobs,
      });
      if (status !== "Sent" && status !== "Scheduled" && prepared.files.length) {
        await attachFilesToCrmEmail({
          emailId: current.id,
          files: prepared.files,
        });
      }
      if (isUuid(form.template)) {
        persistRemoteEmail(
          await tryCrmEmail(() =>
            applyCrmEmailTemplate(current.id, { templateId: form.template }),
          ),
        );
      }
      if (status === "Sent" || status === "Scheduled") {
        const sent = await sendCrmEmail(
          current.id,
          {
            ...(status === "Scheduled" && at ? { scheduledAt: at.toISOString() } : {}),
            html: prepared.html,
            files: prepared.files,
          },
        );
        const unsent =
          !sent || sent.status === "Draft" || sent.status === "Failed";
        if (unsent && status === "Sent") {
          upsertEmail({
            ...current,
            ...(sent ?? {}),
            status: "Draft",
            outbound: true,
          });
          setSending(false);
          setSendError(
            "The email was not sent. Check the recipient and try again. A draft was kept on this page.",
          );
          return;
        }
        current =
          persistRemoteEmail(
            sent
              ? {
                  ...current,
                  ...sent,
                  id: sent.id,
                  outbound: true,
                  status: sent.status === "Scheduled" ? "Scheduled" : "Sent",
                }
              : { ...current, status, outbound: true },
          ) ?? current;
        keptId = current.id;
      }
    } catch (err) {
      upsertEmail({ ...local, status: "Draft", outbound: true });
      setSending(false);
      setSendError(
        err instanceof Error
          ? err.message
          : "Could not send. The message was saved as a draft on this page.",
      );
      return;
    }

    setSending(false);
    void layoutId;
    void redirect;
    if (after === "follow-up") {
      router.push("/activities/reminders/create");
      return;
    }
    if (after === "deal") {
      router.push(
        form.relatedKind === "Deal" && form.relatedId
          ? `/sales/deals/detail/${form.relatedId}`
          : "/sales/deals",
      );
      return;
    }
    if (status === "Draft") {
      router.push(`/activities/emails?folder=drafts&focus=${keptId}`);
      return;
    }
    if (status === "Scheduled") {
      router.push(`/activities/emails?folder=scheduled&focus=${keptId}`);
      return;
    }
    router.push(`/activities/emails?folder=sent&focus=${keptId}`);
  }

  const contactName = form.relatedName || form.to[0] || "";
  const visibleTemplates = searchEmailTemplates(templateQuery);

  function keepSignatureIfPresent(nextHtml: string) {
    if (!hasAnySignature(form.body)) return nextHtml;
    const signature = getActiveSignatureProfile()?.body ?? "";
    return appendSignature(nextHtml, signature);
  }

  function applyAiBody(nextHtml: string) {
    const replacement = stripAllSignatures(nextHtml).trim();
    update("body", keepSignatureIfPresent(replacement));
  }

  async function runAi(work: () => Promise<string>) {
    const seq = ++aiSeq.current;
    setImproving(true);
    try {
      const html = await work();
      if (seq !== aiSeq.current) return;
      applyAiBody(html);
      setAskOpen(false);
    } catch (err) {
      if (seq !== aiSeq.current) return;
      setSendError(err instanceof Error ? err.message : "Google AI could not write this email.");
    } finally {
      if (seq === aiSeq.current) setImproving(false);
    }
  }

  const aiRecipient = contactName.includes("@") ? undefined : contactName;

  function writeFromPrompt(prompt: string) {
    void runAi(() =>
      requestEmailAi({
        mode: htmlToPlainText(stripAllSignatures(form.body)) ? "edit" : "draft",
        html: stripAllSignatures(form.body),
        prompt,
        recipientName: aiRecipient,
        subject: form.subject,
      }),
    );
  }

  function rewriteWith(tone: EmailTone, action?: "brief" | "clarity") {
    const source = stripAllSignatures(form.body);
    void runAi(() =>
      requestEmailAi({
        mode: "rewrite",
        html: source,
        tone,
        action,
        recipientName: aiRecipient,
        subject: form.subject,
      }),
    );
  }

  function insertHtml(chunk: string) {
    const profile = getActiveSignatureProfile();
    setForm((prev) => {
      let html = prev.body;
      for (const item of listSignatureProfiles()) {
        html = stripSignature(html, item.body);
      }
      html = html.replace(/(<p><\/p>\s*)+$/g, "").trim();
      return { ...prev, body: appendSignature(`${html}${chunk}`, profile?.body ?? "") };
    });
  }

  function insertImageFile(file: File) {
    setForm((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        { id: crypto.randomUUID(), name: file.name, size: file.size, file },
      ],
    }));
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (src) {
        insertHtml(
          `<p><img src="${src}" alt="" style="max-width:100%;height:auto;border-radius:4px;" /></p>`,
        );
      }
    };
    reader.readAsDataURL(file);
  }

  function applyTemplate(item: EmailTemplate) {
    aiSeq.current += 1;
    setImproving(false);
    const signature = getActiveSignatureProfile()?.body ?? "";
    const html = renderEmailTemplateHtml(
      item,
      contactName.includes("@") ? undefined : contactName,
    );
    setForm((prev) => ({
      ...prev,
      template: item.name,
      subject: filledTemplateSubject(
        item,
        contactName.includes("@") ? undefined : contactName,
      ),
      body: signature ? appendSignature(html, signature) : html,
    }));
    setEditorEpoch((n) => n + 1);
    setTemplatesOpen(false);
    setTemplateQuery("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {sendError ? (
        <div
          role="alert"
          className="mx-6 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {sendError}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">
          <EmailRecipients
            onBack={() => router.push("/activities/emails")}
            to={form.to}
            recipientDraft={recipientDraft}
            onDraftChange={(val) => {
              setRecipientDraft(val);
              if (errors.to) setErrors((prev) => ({ ...prev, to: undefined }));
            }}
            onAddRecipient={addRecipient}
            onRemoveRecipient={removeRecipient}
            showCc={showCc}
            showBcc={showBcc}
            onToggleCc={() => setShowCc((v) => !v)}
            onToggleBcc={() => setShowBcc((v) => !v)}
            onHideCc={() => {
              setShowCc(false);
              setCcDraft("");
            }}
            onHideBcc={() => {
              setShowBcc(false);
              setBccDraft("");
            }}
            cc={form.cc}
            ccDraft={ccDraft}
            onCcDraftChange={(val) => {
              setCcDraft(val);
              if (errors.cc) setErrors((prev) => ({ ...prev, cc: undefined }));
            }}
            onAddCc={addCc}
            onRemoveCc={removeCc}
            bcc={form.bcc}
            bccDraft={bccDraft}
            onBccDraftChange={(val) => {
              setBccDraft(val);
              if (errors.bcc) setErrors((prev) => ({ ...prev, bcc: undefined }));
            }}
            onAddBcc={addBcc}
            onRemoveBcc={removeBcc}
            error={errors.to}
            ccError={errors.cc}
            bccError={errors.bcc}
          />
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-5 py-3">
            <span className="text-sm text-muted-foreground">From:</span>
            {canPickFrom ? (
              <div className="relative min-w-0 flex-1" ref={fromRef}>
                <button
                  type="button"
                  onClick={() => setFromOpen((v) => !v)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md py-0.5 text-sm font-medium text-foreground hover:bg-slate-50"
                >
                  <span className="truncate">{fromLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
                {fromOpen ? (
                  <div className="absolute top-8 left-0 z-30 w-[min(100%,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {fromIdentities.map((item) => (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            from: item.email,
                            body: applyPersonaSignature(prev.body, item.email),
                          }));
                          setFromOpen(false);
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            form.from === item.email
                              ? "text-[#5A32A3]"
                              : "text-transparent"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-slate-800">
                            {item.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {item.email} · {sendAsLabel(item.kind)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">
                {fromLabel}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-sm text-muted-foreground">Subject</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="Add a subject"
              />
              <SubjectImproveButton
                current={form.subject}
                body={form.body}
                recipientName={contactName.includes("@") ? undefined : contactName}
                onPick={(subject) => update("subject", subject)}
              />
            </div>
            <div className="relative" ref={templatesRef}>
              <button
                type="button"
                onClick={() => setTemplatesOpen((v) => !v)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {form.template || "Templates"}
              </button>
              {templatesOpen ? (
                <div className="absolute top-9 right-0 z-30 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="relative border-b border-slate-100 p-2">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      value={templateQuery}
                      onChange={(e) => setTemplateQuery(e.target.value)}
                      placeholder="Search templates"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-8 text-[12px] outline-none"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {visibleTemplates.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyTemplate(item)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-[12px] font-semibold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.category} · {item.subject}
                        </span>
                      </button>
                    ))}
                    {visibleTemplates.length === 0 ? (
                      <p className="px-3 py-4 text-[12px] text-slate-400">
                        No templates match “{templateQuery}”
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {submitted && errors.subject && (
            <p className="px-5 pb-2 text-xs text-destructive">
              {errors.subject}
            </p>
          )}

          <EmailEditor
            key={editorEpoch}
            body={form.body}
            onChange={(val) => update("body", val)}
            error={errors.body}
            submitted={submitted}
            recipientName={form.relatedName || form.to[0]}
            subject={form.subject}
            importance={form.importance}
            onImportanceChange={(value) => update("importance", value)}
            attachments={form.attachments}
            onAttachClick={() => fileInputRef.current?.click()}
            onRemoveAttachment={(id) =>
              update(
                "attachments",
                form.attachments.filter((item) => item.id !== id),
              )
            }
            onDropFiles={handleFilesSelected}
            aiBusy={improving}
            onAskMeTo={() => setAskOpen(true)}
            onAiTone={(tone) => rewriteWith(tone)}
            onAiShorten={() => rewriteWith("professional", "brief")}
            onAiClarity={() => rewriteWith("professional", "clarity")}
            onAiRegenerate={() => rewriteWith("professional")}
          />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
        <ComposeActionBar
          sending={sending}
          improving={improving}
          body={form.body}
          onAttach={() => fileInputRef.current?.click()}
          onInsertImage={insertImageFile}
          onInsertTable={() =>
            insertHtml(
              `<table class="fc-email-table" style="border-collapse:collapse;width:100%;max-width:100%;table-layout:fixed;margin:8px 0;"><tbody>${`<tr>${`<td style="border:1px solid #cbd5e1;padding:6px 8px;min-width:48px;vertical-align:top;"><br></td>`.repeat(3)}</tr>`.repeat(3)}</tbody></table><p><br></p>`,
            )
          }
          onInsertEmoji={(emoji) => insertHtml(`<p>${emoji}</p>`)}
          onSignature={(html) => update("body", html)}
          onImprove={() => setAskOpen(true)}
          onReminder={() => router.push("/activities/reminders/create")}
          onSaveDraft={() => void save("Draft")}
          onSend={(action, at) => {
            if (action === "schedule") void save("Scheduled", "emails", at);
            else if (action === "follow-up") void save("Sent", "follow-up");
            else if (action === "deal-stage") void save("Sent", "deal");
            else void save("Sent");
          }}
        />
        </div>

        <ComposeContextRail
          recipientName={contactName.includes("@") ? undefined : contactName}
          recipientEmail={form.to[0]}
        />
      </div>
      <EditWithAiModal
        open={askOpen}
        busy={improving}
        onClose={() => setAskOpen(false)}
        onWrite={writeFromPrompt}
      />
    </div>
  );
}
