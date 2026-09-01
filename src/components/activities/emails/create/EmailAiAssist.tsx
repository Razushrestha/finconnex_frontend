"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  draftEmailFromPrompt,
  EMAIL_TONES,
  rewriteEmailWithAi,
  type EmailTone,
} from "@/lib/emails/ai-compose";

interface EmailAiAssistProps {
  html: string;
  onChange: (html: string) => void;
  recipientName?: string;
  subject?: string;
}

type SpeechRec = {
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const TONES: EmailTone[] = ["friendly", "professional", "emotional", "loving"];

const READY_PROMPTS = [
  "Write a concise follow-up on the outstanding documents",
  "Draft a professional reply confirming next steps",
  "Write a polite request to book a 20-minute call",
  "Summarise the proposal and ask for a decision",
];

export function EmailAiAssist({
  html,
  onChange,
  recipientName,
  subject,
}: EmailAiAssistProps) {
  const [tone, setTone] = useState<EmailTone>("professional");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function notice(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  }

  function writeFromPrompt(text: string) {
    const next = text.trim();
    if (!next) return;
    setBusy(true);
    window.setTimeout(() => {
      onChange(
        draftEmailFromPrompt({
          prompt: next,
          tone,
          recipientName,
          subject,
        }),
      );
      setBusy(false);
      setOpen(false);
      notice("Draft written");
    }, 380);
  }

  function shorten() {
    setBusy(true);
    window.setTimeout(() => {
      onChange(
        rewriteEmailWithAi({
          html,
          tone,
          action: "brief",
          recipientName,
          subject,
        }),
      );
      setBusy(false);
      notice("Shortened");
    }, 380);
  }

  function toggleVoice() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      notice("Voice is not supported in this browser");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-AU";
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript?.trim();
      if (said) writeFromPrompt(said);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    notice("Listening…");
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
          style={{ backgroundColor: "#5A32A3" }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI
        </button>
        <button
          type="button"
          onClick={toggleVoice}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold",
            listening
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          <Mic className={cn("h-3.5 w-3.5", listening && "animate-pulse")} />
          {listening ? "Listening…" : "Voice"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={shorten}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Shorten
        </button>
        {flash ? (
          <span className="text-[11px] font-medium text-[#5A32A3]">{flash}</span>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3]">
                <Sparkles className="h-3.5 w-3.5" />
                Write with AI
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the email you want… e.g. Ask Olivia for the latest payslips and confirm we can lodge this week."
                className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#5A32A3]/20"
              />
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Tone
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((id) => {
                    const item = EMAIL_TONES.find((t) => t.id === id)!;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTone(id)}
                        className={cn(
                          "h-8 rounded-lg border px-2.5 text-[11px] font-semibold",
                          tone === id
                            ? "border-violet-200 bg-violet-50 text-[#5A32A3]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {READY_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPrompt(item)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] text-slate-600 hover:border-violet-200 hover:bg-[#F8F4FC]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !prompt.trim()}
                onClick={() => writeFromPrompt(prompt)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: "#5A32A3" }}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Write email
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
