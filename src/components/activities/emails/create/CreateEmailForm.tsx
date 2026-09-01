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
import { createEmail } from "@/lib/emails/store";
import { takeCompose } from "@/lib/emails/outlook";
import {
  editEmailWithPrompt,
  plainTextToEmailHtml,
  rewriteEmailWithAi,
  type EmailTone,
} from "@/lib/emails/ai-compose";
import { searchEmailTemplates, type EmailTemplate } from "@/lib/emails/templates";
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
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";
import { canChooseFromAddress, listFromIdentities, sendAsLabel } from "@/lib/emails/send-as";
import { formatRulesAt } from "@/lib/rules/storage";
import { relatedRecordsForPerson } from "@/lib/emails/related-records";
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
  template: string;
  attachments: Attachment[];
  importance: EmailImportance;
}

const initialState: FormState = {
  subject: "",
  body: "",
  from: "bishnu@nepatronix.com",
  to: [],
  cc: [],
  bcc: [],
  relatedKind: "",
  relatedName: "",
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
    to: defaults?.to
      ? defaults.to.split(/[,;]/).map((item) => item.trim()).filter(Boolean)
      : [],
    cc: defaults?.cc
      ? defaults.cc.split(/[,;]/).map((item) => item.trim()).filter(Boolean)
      : [],
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
    const fromEmail = listFromIdentities()[0]?.email ?? initialState.from;
    const profile = getSignatureProfileForEmail(fromEmail);
    setActiveSignatureId(profile.id);
    if (draft?.cc?.length) setShowCc(true);
    setForm((prev) => {
      const next = draft
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
      return {
        ...next,
        from: fromEmail,
        body: hasAnySignature(next.body)
          ? next.body
          : appendSignature(next.body, profile.body),
      };
    });
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const fromIdentities = listFromIdentities();
  const canPickFrom = canChooseFromAddress();

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

  function parseAddresses(raw: string) {
    return raw
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function addToList(
    key: "to" | "cc" | "bcc",
    raw: string,
    clearDraft: () => void,
  ) {
    const next = parseAddresses(raw);
    if (next.length === 0) return;
    update(key, [...new Set([...form[key], ...next])]);
    clearDraft();
  }

  function addRecipient() {
    addToList("to", recipientDraft, () => setRecipientDraft(""));
  }

  function removeRecipient(value: string) {
    update(
      "to",
      form.to.filter((r) => r !== value),
    );
  }

  function addCc() {
    addToList("cc", ccDraft, () => setCcDraft(""));
  }

  function removeCc(value: string) {
    update(
      "cc",
      form.cc.filter((r) => r !== value),
    );
  }

  function addBcc() {
    addToList("bcc", bccDraft, () => setBccDraft(""));
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
    }));
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...next],
    }));
  }

  function mergeList(list: string[], draft: string) {
    return [...new Set([...list, ...parseAddresses(draft)])];
  }

  async function save(
    status: EmailStatus,
    after: "emails" | "follow-up" | "deal" = "emails",
    at?: Date,
  ) {
    setSubmitted(true);
    setSendError(null);
    const to = mergeList(form.to, recipientDraft);
    const cc = mergeList(form.cc, ccDraft);
    const bcc = mergeList(form.bcc, bccDraft);
    setForm((prev) => ({ ...prev, to, cc, bcc }));
    setRecipientDraft("");
    setCcDraft("");
    setBccDraft("");

    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.body.trim()) next.body = "Body is required";
    if (to.length === 0) next.to = "At least one recipient is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const relatedTo =
      form.relatedKind && form.relatedName
        ? `${form.relatedKind}: ${form.relatedName}`
        : undefined;

    setSending(true);
    const remote = await tryCrmEmail(() =>
      createCrmEmail({
        subject: form.subject.trim(),
        body: form.body.trim(),
        from: form.from.trim(),
        to,
        cc,
        bcc,
        relatedType: form.relatedKind ? form.relatedKind.toUpperCase() : undefined,
        relatedTo,
        status: "Draft",
        template: form.template || undefined,
      }),
    );

    if (remote) {
      persistRemoteEmail(remote);
      if (form.template) {
        persistRemoteEmail(
          await tryCrmEmail(() =>
            applyCrmEmailTemplate(remote.id, {
              template: form.template,
              templateName: form.template,
            }),
          ),
        );
      }
      if (status === "Sent" || status === "Scheduled") {
        const sent = await tryCrmEmail(() =>
          sendCrmEmail(
            remote.id,
            status === "Scheduled" ? { scheduled: true } : {},
          ),
        );
        if (!sent && status === "Sent") {
          setSending(false);
          setSendError("CRM created the draft but send failed. Open the email to retry.");
          router.push(`/activities/emails/detail/${remote.id}`);
          return;
        }
        persistRemoteEmail(
          sent ?? { ...remote, status, sentDate: formatRulesAt(new Date()) },
        );
      }
      setSending(false);
      void layoutId;
      void redirect;
      router.push(`/activities/emails?focus=${remote.id}`);
      return;
    }

    if (status === "Sent") {
      const result = await sendEmailDemoLive({
        email: to[0],
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      if (!result.ok) {
        setSending(false);
        setSendError(result.message);
        return;
      }
    }

    const body = form.body.trim();
    const created = createEmail({
      subject: form.subject.trim(),
      body,
      from: form.from.trim(),
      to,
      cc,
      bcc,
      relatedTo,
      relatedType: form.relatedKind ? form.relatedKind.toUpperCase() : undefined,
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
    setSending(false);
    void layoutId;
    void redirect;
    if (after === "follow-up") {
      router.push("/activities/reminders/create");
      return;
    }
    if (after === "deal") {
      const deal = relatedRecordsForPerson(
        form.relatedName || undefined,
        to[0],
      ).find((item) => item.kind === "deal");
      router.push(deal?.href ?? "/sales/deals");
      return;
    }
    router.push(`/activities/emails?focus=${created.id}`);
  }

  const contactName = form.relatedName || form.to[0] || "";
  const related = relatedRecordsForPerson(
    contactName.includes("@") ? undefined : contactName,
    form.to[0],
  );
  const primaryDeal = related.find((item) => item.kind === "deal");
  const visibleTemplates = searchEmailTemplates(templateQuery);

  function keepSignatureIfPresent(nextHtml: string) {
    if (!hasAnySignature(form.body)) return nextHtml;
    return appendSignature(nextHtml, getActiveSignatureProfile().body);
  }

  function applyAiBody(nextHtml: string) {
    update("body", keepSignatureIfPresent(nextHtml));
  }

  function runAi(build: () => string) {
    setImproving(true);
    window.setTimeout(() => {
      applyAiBody(build());
      setImproving(false);
      setAskOpen(false);
    }, 280);
  }

  const aiRecipient = contactName.includes("@") ? undefined : contactName;

  function writeFromPrompt(prompt: string) {
    runAi(() =>
      editEmailWithPrompt({
        html: stripAllSignatures(form.body),
        prompt,
        recipientName: aiRecipient,
        subject: form.subject,
      }),
    );
  }

  function rewriteWith(tone: EmailTone, action?: "brief" | "clarity") {
    runAi(() =>
      rewriteEmailWithAi({
        html: stripAllSignatures(form.body),
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
      return { ...prev, body: appendSignature(`${html}${chunk}`, profile.body) };
    });
  }

  function insertImageFile(file: File) {
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
    setForm((prev) => ({
      ...prev,
      template: item.name,
      subject: item.subject,
      body: keepSignatureIfPresent(plainTextToEmailHtml(item.body)),
    }));
    setTemplatesOpen(false);
    setTemplateQuery("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {sendError ? (
        <div className="mx-6 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
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
            onDraftChange={setRecipientDraft}
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
            onCcDraftChange={setCcDraft}
            onAddCc={addCc}
            onRemoveCc={removeCc}
            bcc={form.bcc}
            bccDraft={bccDraft}
            onBccDraftChange={setBccDraft}
            onAddBcc={addBcc}
            onRemoveBcc={removeBcc}
            error={errors.to}
            submitted={submitted}
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
                  <span className="truncate">{form.from}</span>
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
                {form.from}
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
                recipientName={contactName.includes("@") ? undefined : contactName}
                dealTitle={primaryDeal?.title}
                dealStage={primaryDeal?.stage}
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
