"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, Loader2, X } from "lucide-react";

interface EditWithAiModalProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onWrite: (prompt: string) => void;
}

export function EditWithAiModal({
  open,
  busy,
  onClose,
  onWrite,
}: EditWithAiModalProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="edit-with-ai-title"
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 id="edit-with-ai-title" className="text-[17px] font-semibold text-slate-900">
            Edit with AI
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-5 pb-3 text-[13px] leading-5 text-slate-500">
          Use a prompt to edit the suggestion or write it from scratch. AI will match
          your tone, voice, and past communication details.
        </p>
        <div className="px-5">
          <div className="relative rounded-lg bg-slate-100">
            <span className="pointer-events-none absolute top-2 right-3 text-[11px] text-slate-400">
              {prompt.length}/500
            </span>
            <textarea
              ref={inputRef}
              value={prompt}
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && prompt.trim()) {
                  event.preventDefault();
                  onWrite(prompt.trim());
                }
              }}
              placeholder="For example, remove the list of services and add pricing, or write a new message with your own details."
              className="min-h-[140px] w-full resize-none bg-transparent px-3 pt-7 pb-3 text-[13px] leading-5 text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400">
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
          <button
            type="button"
            disabled={busy || !prompt.trim()}
            onClick={() => onWrite(prompt.trim())}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Write draft
          </button>
        </div>
      </div>
    </div>
  );
}
