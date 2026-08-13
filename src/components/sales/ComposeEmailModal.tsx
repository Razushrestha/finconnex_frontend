"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  ChevronDown,
  Mail,
  Minus,
  Maximize2,
  X,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Send as SendIcon,
} from "lucide-react";

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
  subject: string;
  body: string;
  attachments: File[];
}

export interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: ComposeEmailRecipient;
  defaultSubject?: string;
  defaultGreeting?: string; // e.g. "Hi Sarah,"
  onSend: (values: ComposeEmailSendValues) => void;
  onDiscard?: () => void;
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function addFiles(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function handleSend() {
    onSend({
      to: recipient.email,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body,
      attachments,
    });
  }

  function handleDiscard() {
    setSubject(defaultSubject);
    setBody("");
    setCc("");
    setBcc("");
    setAttachments([]);
    onDiscard?.();
    onClose();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[560px] overflow-hidden rounded-xl border border-border bg-white text-card-foreground shadow-2xl ring-1 ring-ring/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Compose Email
            </p>
            <p className="text-[11px] text-muted-foreground">
              To: {recipient.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((v) => !v)}
            aria-label="Minimize"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Expand"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* To / Cc / Bcc */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                To
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-0.5 pl-1 pr-2 text-xs text-foreground font-medium">
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/30 text-[8px] font-medium text-foreground">
                  {recipient.initials ??
                    recipient.name.slice(0, 2).toUpperCase()}
                  {recipient.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-card bg-emerald-500" />
                  )}
                </span>
                {recipient.email}
              </span>
            </div>
            {!showCcBcc && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cc Bcc
              </button>
            )}
          </div>

          {showCcBcc && (
            <div className="space-y-2 border-b border-border px-4 py-2.5 bg-muted/20">
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc"
                className="w-full border-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Bcc"
                className="w-full border-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          )}

          {/* Subject */}
          <div className="border-b border-border px-4 py-2.5">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-none bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 bg-muted/30">
            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Templates
              <ChevronDown className="h-3 w-3" />
            </button>
            <span className="h-4 w-px bg-border" />
            {[Bold, Italic, Underline, List, ListOrdered, Link2].map(
              (Icon, i) => (
                <button
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ),
            )}
          </div>

          {/* Body */}
          <div className="px-4 py-3.5">
            {defaultGreeting && (
              <p className="mb-2.5 text-sm font-medium text-foreground">
                {defaultGreeting}
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={10}
              className="w-full resize-none border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Drop zone */}
          <div className="px-4 pb-4">
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
              className={`cursor-pointer rounded-lg border border-dashed py-3.5 text-center text-xs font-medium transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {attachments.length > 0
                ? `${attachments.length} file${attachments.length > 1 ? "s" : ""} attached`
                : "Drop files here or click to browse"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                aria-label="Insert image"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                aria-label="Record voice note"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Mic className="h-4 w-4" />
              </button>
              <span className="ml-1 text-[11px] text-muted-foreground">
                Saved at{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDiscard}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Discard
              </button>
              <div className="flex items-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-xs">
                <button
                  onClick={handleSend}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <SendIcon className="h-3.5 w-3.5" />
                  Send
                </button>
                <button
                  aria-label="Send options"
                  className="border-l border-primary-foreground/20 px-2 py-2 hover:bg-primary/90 transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
