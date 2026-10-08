"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutTemplate, PenLine, Search, WandSparkles } from "lucide-react";

import { TaskDescriptionEditor } from "@/components/activities/tasks/TaskDescriptionEditor";
import { EditWithAiModal } from "@/components/activities/emails/create/EditWithAiModal";
import { SubjectImproveButton } from "@/components/activities/emails/create/SubjectImproveButton";
import { htmlToPlainText, plainTextToEmailHtml } from "@/lib/emails/ai-compose";
import { requestEmailAi } from "@/lib/emails/request-email-ai";
import {
  appendSignature,
  getActiveSignatureProfile,
  stripAllSignatures,
} from "@/lib/emails/signature";
import {
  filledTemplateSubject,
  renderEmailTemplateHtml,
  searchEmailTemplates,
  type EmailTemplate,
} from "@/lib/emails/templates";
import type { AutomationEntityType } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

import { EmailRecipientsField } from "./EmailRecipientsField";

/**
 * Send Email, laid out like the Emails compose page (To / From / Subject with
 * Improve subject and Templates, the same rich-text editor, Signature and
 * "Ask me to…") but writing the step's config instead of sending.
 *
 * Config keys: toEmail/cc/bcc (through EmailRecipientsField), subject, body
 * (HTML). Anything else already on the step, such as templateId, is kept.
 */
export function SendEmailActionForm({
  config,
  entityType,
  onChange,
}: {
  config: Record<string, unknown>;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const subject = typeof config.subject === "string" ? config.subject : "";
  const rawBody = typeof config.body === "string" ? config.body : "";
  // Steps saved from the old plain textarea hold text, not HTML. Convert only
  // a body that came from outside: rewriting the editor's own output (its
  // first keystroke is bare text) would move the caret.
  const [emitted, setEmitted] = useState<string | null>(null);
  const body = useMemo(
    () =>
      rawBody !== emitted && rawBody && !/<[a-z][\s\S]*>/i.test(rawBody)
        ? plainTextToEmailHtml(rawBody)
        : rawBody,
    [rawBody, emitted],
  );

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const templatesRef = useRef<HTMLDivElement>(null);

  function set(patch: Record<string, unknown>) {
    onChange({ ...config, ...patch });
  }

  function setBody(html: string) {
    // An editor left with only empty paragraphs is no message at all, so the
    // step's "Message is required" check still applies.
    const next = htmlToPlainText(html).trim() ? html : "";
    setEmitted(next);
    set({ body: next });
  }

  useEffect(() => {
    if (!templatesOpen) return;
    function onDoc(event: MouseEvent) {
      if (!templatesRef.current?.contains(event.target as Node)) {
        setTemplatesOpen(false);
        setTemplateQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [templatesOpen]);

  const visibleTemplates = searchEmailTemplates(templateQuery);

  function applyTemplate(item: EmailTemplate) {
    const signature = getActiveSignatureProfile()?.body ?? "";
    const html = renderEmailTemplateHtml(item, undefined);
    set({
      subject: filledTemplateSubject(item, undefined),
      body: signature ? appendSignature(html, signature) : html,
    });
    setTemplatesOpen(false);
    setTemplateQuery("");
  }

  const signature = getActiveSignatureProfile()?.body ?? "";
  function insertSignature() {
    if (!signature) return;
    setBody(appendSignature(stripAllSignatures(body), signature));
  }

  async function writeFromPrompt(prompt: string) {
    setAiBusy(true);
    setAiError("");
    try {
      const source = stripAllSignatures(body);
      const html = await requestEmailAi({
        mode: htmlToPlainText(source).trim() ? "edit" : "draft",
        html: source,
        prompt,
        subject,
      });
      const next = stripAllSignatures(html).trim();
      setBody(signature && body.includes(signature) ? appendSignature(next, signature) : next);
      setAskOpen(false);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Google AI could not write this email.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-3">
        <EmailRecipientsField entityType={entityType} config={config} onChange={onChange} />
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <span className="text-sm text-muted-foreground">From:</span>
        <span className="text-sm font-medium text-foreground">
          The workflow owner&apos;s mailbox
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Subject<span className="text-rose-500">*</span>
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            value={subject}
            onChange={(e) => set({ subject: e.target.value })}
            placeholder="Add a subject"
            aria-label="Subject"
          />
          <SubjectImproveButton
            current={subject}
            body={body}
            onPick={(next) => set({ subject: next })}
          />
        </div>
        <div className="relative" ref={templatesRef}>
          <button
            type="button"
            onClick={() => setTemplatesOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-faint)]"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
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
                    <span className="text-[12px] font-semibold text-slate-800">{item.name}</span>
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

      <div className="border-t border-slate-100 px-4 py-3">
        <TaskDescriptionEditor
          value={body}
          onChange={setBody}
          placeholder="Write your email…"
          compactToolbar
          fillHeight
          className="flex h-[360px] min-h-0 flex-col"
        />
      </div>

      {aiError ? <p className="px-4 pb-2 text-xs text-rose-600">{aiError}</p> : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <button
          type="button"
          onClick={insertSignature}
          disabled={!signature}
          title={signature ? "Add your signature" : "Set up a signature in Emails first"}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50",
            !signature && "cursor-not-allowed opacity-50",
          )}
        >
          <PenLine className="h-4 w-4" />
          Signature
        </button>
        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-[var(--brand-primary)] hover:bg-[var(--brand-primary-faint)]"
        >
          <WandSparkles className="h-4 w-4" />
          Ask me to…
        </button>
      </div>

      <EditWithAiModal
        open={askOpen}
        busy={aiBusy}
        onClose={() => setAskOpen(false)}
        onWrite={(prompt) => void writeFromPrompt(prompt)}
      />
    </div>
  );
}
