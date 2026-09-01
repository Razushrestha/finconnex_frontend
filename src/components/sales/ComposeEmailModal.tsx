"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Clock,
  Flag,
  Image as ImageIcon,
  Mail,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Send as SendIcon,
  Sparkles,
  X,
} from "lucide-react";
import { EmailAiAssist } from "@/components/activities/emails/create/EmailAiAssist";
import { TaskDescriptionEditor } from "@/components/activities/tasks/TaskDescriptionEditor";
import { cn } from "@/lib/utils";

export interface ComposeEmailRecipient {
  name: string;
  email: string;
  avatarUrl?: string;
  initials?: string;
  isOnline?: boolean;
}

export interface ComposeEmailSendValues {
  to: string;
  cc?: string;
  bcc?: string;
  toList?: string[];
  ccList?: string[];
  bccList?: string[];
  subject: string;
  body: string;
  attachments: File[];
  sendAt?: string;
  importance?: "normal" | "high";
}

export interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: ComposeEmailRecipient;
  defaultSubject?: string;
  defaultGreeting?: string;
  onSend: (values: ComposeEmailSendValues) => void;
  onDiscard?: () => void;
}

type SizeMode = "normal" | "expanded" | "minimized";

const TEMPLATES = [
  {
    id: "follow-up",
    label: "Follow-up",
    subject: "Following up — {first}",
    body: `<p>Hi {first},</p><p>Just checking you received the loan options we discussed. Happy to walk through rates, fees, or next steps whenever it suits.</p><p>Kind regards</p>`,
  },
  {
    id: "intro",
    label: "Introduction",
    subject: "Nice to meet you, {first}",
    body: `<p>Hi {first},</p><p>It was a pleasure speaking with you. I will put together a short summary of suitable lenders and what we would need to proceed.</p><p>Kind regards</p>`,
  },
  {
    id: "docs",
    label: "Document request",
    subject: "Documents needed to progress your application",
    body: `<p>Hi {first},</p><p>To keep your application moving, please send:</p><ul><li>Photo ID</li><li>Last 2 payslips</li><li>3 months of bank statements</li></ul><p>You can reply to this email or upload them in your client portal.</p><p>Kind regards</p>`,
  },
  {
    id: "meeting",
    label: "Meeting recap",
    subject: "Recap of our conversation",
    body: `<p>Hi {first},</p><p>Thanks for your time today. As discussed, next I will compare lender options against your goals and come back with a clear recommendation.</p><p>Kind regards</p>`,
  },
  {
    id: "proposal",
    label: "Proposal follow-up",
    subject: "Your loan proposal is ready, {first}",
    body: `<p>Hi {first},</p><p>Your loan proposal is ready for review. Let me know if you would like a quick call to go through the numbers, or I can adjust anything before we lodge.</p><p>Kind regards</p>`,
  },
] as const;

function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function applyTokens(text: string, recipient: ComposeEmailRecipient) {
  return text
    .replaceAll("{first}", firstNameOf(recipient.name))
    .replaceAll("{name}", recipient.name)
    .replaceAll("{email}", recipient.email);
}

function parseEmailTokens(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function chipInitials(value: string) {
  const local = value.split("@")[0] ?? value;
  const parts = local.replace(/[._-]+/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

function greetingHtml(greeting?: string) {
  if (!greeting?.trim()) return "";
  return `<p>${greeting.trim()}</p><p><br></p>`;
}

function RecipientChipRow({
  label,
  values,
  draft,
  onDraftChange,
  onCommit,
  onRemove,
  placeholder,
  trailing,
}: {
  label: string;
  values: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onCommit: (tokens: string[]) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  trailing?: ReactNode;
}) {
  function commit(raw: string) {
    const tokens = parseEmailTokens(raw);
    if (!tokens.length) return;
    onCommit(tokens);
  }

  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 w-7 shrink-0 text-[11px] font-medium text-slate-400">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-0.5 pr-1 pl-1 text-[11px] font-medium text-slate-800"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5A32A3] text-[8px] font-bold text-white">
              {chipInitials(value)}
            </span>
            <span className="max-w-[180px] truncate">{value}</span>
            <button
              type="button"
              onClick={() => onRemove(value)}
              aria-label={`Remove ${value}`}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            if (/[,;]/.test(next)) {
              commit(next);
              return;
            }
            onDraftChange(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab" || e.key === ";") {
              if (draft.trim()) {
                e.preventDefault();
                commit(draft);
              }
              return;
            }
            if (e.key === "Backspace" && !draft && values.length) {
              onRemove(values[values.length - 1]!);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\n]/.test(text)) {
              e.preventDefault();
              commit(`${draft} ${text}`);
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          placeholder={values.length ? "Add another…" : placeholder}
          className="min-w-[140px] flex-1 border-none bg-transparent py-1 text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
      {trailing}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tomorrowNine() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  recipient,
  defaultSubject = "",
  defaultGreeting,
  onSend,
  onDiscard,
}: ComposeEmailModalProps) {
  const [size, setSize] = useState<SizeMode>("normal");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [toList, setToList] = useState<string[]>(() =>
    recipient.email ? [recipient.email] : [],
  );
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccList, setBccList] = useState<string[]>([]);
  const [toDraft, setToDraft] = useState("");
  const [ccDraft, setCcDraft] = useState("");
  const [bccDraft, setBccDraft] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(() => greetingHtml(defaultGreeting));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(tomorrowNine);
  const [importance, setImportance] = useState<"normal" | "high">("normal");
  const [savedAt, setSavedAt] = useState(() => new Date());
  const [flash, setFlash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLDivElement>(null);

  const first = firstNameOf(recipient.name);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setSavedAt(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [isOpen, subject, body, toList, ccList, bccList, attachments.length]);

  useEffect(() => {
    if (!templatesOpen && !sendOpen) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (
        templatesOpen &&
        templatesRef.current &&
        !templatesRef.current.contains(target)
      ) {
        setTemplatesOpen(false);
      }
      if (sendOpen && sendRef.current && !sendRef.current.contains(target)) {
        setSendOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [templatesOpen, sendOpen]);

  const savedLabel = useMemo(
    () =>
      savedAt.toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      }),
    [savedAt],
  );

  if (!isOpen) return null;

  function notice(text: string) {
    setFlash(text);
    window.setTimeout(() => setFlash(null), 2200);
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const next = Array.from(files);
    if (!next.length) return;
    setAttachments((prev) => [...prev, ...next]);
    setSavedAt(new Date());
  }

  function removeFile(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setSubject(applyTokens(template.subject, recipient));
    setBody(applyTokens(template.body, recipient));
    setTemplatesOpen(false);
    setSavedAt(new Date());
    notice(`${template.label} applied`);
  }

  function addToField(
    setter: (update: (prev: string[]) => string[]) => void,
    tokens: string[],
    clearDraft: () => void,
  ) {
    setter((prev) => {
      const next = [...prev];
      for (const token of tokens) {
        const value = token.trim();
        if (!value) continue;
        if (next.some((item) => item.toLowerCase() === value.toLowerCase())) {
          continue;
        }
        next.push(value);
      }
      return next;
    });
    clearDraft();
    setSavedAt(new Date());
  }

  function handleSend(sendAt?: string) {
    const pendingTo = parseEmailTokens(toDraft);
    const pendingCc = parseEmailTokens(ccDraft);
    const pendingBcc = parseEmailTokens(bccDraft);
    const finalTo = [...toList];
    for (const token of pendingTo) {
      if (!finalTo.some((item) => item.toLowerCase() === token.toLowerCase())) {
        finalTo.push(token);
      }
    }
    const finalCc = [...ccList, ...pendingCc];
    const finalBcc = [...bccList, ...pendingBcc];
    if (!finalTo.length) {
      notice("Add at least one recipient");
      return;
    }
    if (!subject.trim() && !body.replace(/<[^>]+>/g, "").trim()) {
      notice("Add a subject or message first");
      return;
    }
    onSend({
      to: finalTo.join(", "),
      cc: finalCc.length ? finalCc.join(", ") : undefined,
      bcc: finalBcc.length ? finalBcc.join(", ") : undefined,
      toList: finalTo,
      ccList: finalCc,
      bccList: finalBcc,
      subject,
      body,
      attachments,
      sendAt,
      importance,
    });
  }

  function handleDiscard() {
    setSubject(defaultSubject);
    setBody(greetingHtml(defaultGreeting));
    setToList(recipient.email ? [recipient.email] : []);
    setCcList([]);
    setBccList([]);
    setToDraft("");
    setCcDraft("");
    setBccDraft("");
    setAttachments([]);
    setImportance("normal");
    onDiscard?.();
    onClose();
  }

  const shellClass = cn(
    "fixed z-50 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl",
    "bottom-14 right-4",
    size === "minimized" && "h-11 w-[320px]",
    size === "normal" &&
      "h-[min(680px,calc(100dvh-4.25rem))] w-[min(640px,calc(100vw-1.5rem))]",
    size === "expanded" &&
      "h-[calc(100dvh-4.25rem)] w-[min(920px,calc(100vw-1.5rem))]",
  );

  return (
    <div className={shellClass} role="dialog" aria-label="Compose Email">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-[#FAF9FC] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#5A32A3] text-white">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-900">
              {subject.trim() || "Compose Email"}
              {importance === "high" ? (
                <Flag className="ml-1.5 inline h-3 w-3 text-rose-500" />
              ) : null}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              To: {first}
              {toList.length > 1 ? ` +${toList.length - 1}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() =>
              setSize((v) => (v === "minimized" ? "normal" : "minimized"))
            }
            aria-label={size === "minimized" ? "Restore" : "Minimize"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setSize((v) => (v === "expanded" ? "normal" : "expanded"))
            }
            aria-label={size === "expanded" ? "Restore size" : "Expand"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            {size === "expanded" ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {size === "minimized" ? null : (
        <>
          <div className="shrink-0 space-y-1.5 border-b border-slate-100 px-4 py-2">
            <RecipientChipRow
              label="To"
              values={toList}
              draft={toDraft}
              onDraftChange={setToDraft}
              onCommit={(tokens) => addToField(setToList, tokens, () => setToDraft(""))}
              onRemove={(value) =>
                setToList((prev) => prev.filter((item) => item !== value))
              }
              placeholder="Type an email, then Enter"
              trailing={
                <div className="mt-1.5 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCc((v) => !v)}
                    className={cn(
                      "text-[11px] font-semibold",
                      showCc ? "text-[#5A32A3]" : "text-slate-400 hover:text-slate-700",
                    )}
                  >
                    Cc
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBcc((v) => !v)}
                    className={cn(
                      "text-[11px] font-semibold",
                      showBcc ? "text-[#5A32A3]" : "text-slate-400 hover:text-slate-700",
                    )}
                  >
                    Bcc
                  </button>
                </div>
              }
            />
            {showCc ? (
              <RecipientChipRow
                label="Cc"
                values={ccList}
                draft={ccDraft}
                onDraftChange={setCcDraft}
                onCommit={(tokens) =>
                  addToField(setCcList, tokens, () => setCcDraft(""))
                }
                onRemove={(value) =>
                  setCcList((prev) => prev.filter((item) => item !== value))
                }
                placeholder="Add Cc"
              />
            ) : null}
            {showBcc ? (
              <RecipientChipRow
                label="Bcc"
                values={bccList}
                draft={bccDraft}
                onDraftChange={setBccDraft}
                onCommit={(tokens) =>
                  addToField(setBccList, tokens, () => setBccDraft(""))
                }
                onRemove={(value) =>
                  setBccList((prev) => prev.filter((item) => item !== value))
                }
                placeholder="Add Bcc"
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() =>
                setImportance((v) => (v === "high" ? "normal" : "high"))
              }
              title="High importance"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md",
                importance === "high"
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
            <div className="relative" ref={templatesRef}>
              <button
                type="button"
                onClick={() => setTemplatesOpen((v) => !v)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-[#5A32A3] hover:bg-violet-50"
              >
                <Sparkles className="h-3 w-3" />
                Templates
                <ChevronDown className="h-3 w-3" />
              </button>
              {templatesOpen ? (
                <div className="absolute top-8 right-0 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {TEMPLATES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyTemplate(item)}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50"
                    >
                      <span className="text-[12px] font-semibold text-slate-800">
                        {item.label}
                      </span>
                      <span className="truncate text-[11px] text-slate-400">
                        {applyTokens(item.subject, recipient)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-3 pt-2">
              <TaskDescriptionEditor
                value={body}
                onChange={(next) => {
                  setBody(next);
                  setSavedAt(new Date());
                }}
                placeholder="Write your message… Use Templates or Write with AI below."
                editorClassName="min-h-[160px] max-h-[280px]"
              />
              <EmailAiAssist
                html={body}
                onChange={(next) => {
                  setBody(next);
                  setSavedAt(new Date());
                }}
                recipientName={recipient.name}
                subject={subject}
              />
            </div>

            <div className="px-4 pt-3 pb-3">
              {attachments.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {attachments.map((file, index) => (
                    <span
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1 pl-2 text-[11px] text-slate-700"
                    >
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      <span className="max-w-[160px] truncate">{file.name}</span>
                      <span className="text-slate-400">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="rounded p-0.5 hover:bg-slate-200"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-lg border border-dashed py-2.5 text-center text-[11px] font-medium",
                  isDragOver
                    ? "border-[#5A32A3] bg-violet-50 text-[#5A32A3]"
                    : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600",
                )}
              >
                Drop files here or click to browse
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {scheduleOpen ? (
            <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-violet-50/50 px-4 py-2">
              <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[12px] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  handleSend(scheduleAt);
                  setScheduleOpen(false);
                }}
                className="h-8 rounded-md bg-[#5A32A3] px-3 text-[11px] font-semibold text-white"
              >
                Schedule
              </button>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="text-[11px] font-medium text-slate-500"
              >
                Cancel
              </button>
            </div>
          ) : null}

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-[#FAF9FC] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                aria-label="Insert image"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <span className="ml-1 truncate text-[11px] text-slate-400">
                {flash ?? `Saved at ${savedLabel}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscard}
                className="text-[12px] font-medium text-slate-500 hover:text-slate-800"
              >
                Discard
              </button>
              <div className="relative flex overflow-hidden rounded-lg bg-[#5A32A3] text-white" ref={sendRef}>
                <button
                  type="button"
                  onClick={() => handleSend()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold hover:bg-[#4c2a8a]"
                >
                  <SendIcon className="h-3.5 w-3.5" />
                  Send
                </button>
                <button
                  type="button"
                  aria-label="Send options"
                  onClick={() => setSendOpen((v) => !v)}
                  className="border-l border-white/20 px-2 py-2 hover:bg-[#4c2a8a]"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {sendOpen ? (
                  <div className="absolute right-0 bottom-11 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setSendOpen(false);
                        handleSend();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <SendIcon className="h-3.5 w-3.5 text-[#5A32A3]" />
                      Send now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSendOpen(false);
                        setScheduleOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                      Schedule send
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSendOpen(false);
                        handleSend(tomorrowNine());
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                      Tomorrow 9:00 AM
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
