"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMAIL_AI_ACTIONS,
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

const PRIMARY_TONES: EmailTone[] = [
  "friendly",
  "professional",
  "emotional",
  "loving",
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function notice(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  }

  function run(opts: { nextTone?: EmailTone; action?: (typeof EMAIL_AI_ACTIONS)[number]["id"]; voiceNotes?: string }) {
    const nextTone = opts.nextTone ?? tone;
    setTone(nextTone);
    setBusy(true);
    window.setTimeout(() => {
      const next = rewriteEmailWithAi({
        html,
        tone: nextTone,
        action: opts.action,
        recipientName,
        subject,
        voiceNotes: opts.voiceNotes,
      });
      onChange(next);
      setBusy(false);
      notice(
        opts.voiceNotes
          ? "Drafted from your voice"
          : opts.action === "brief"
            ? "Shortened with AI"
            : `Rewritten · ${EMAIL_TONES.find((t) => t.id === nextTone)?.label}`,
      );
    }, 420);
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
      if (said) run({ voiceNotes: said });
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    notice("Listening… speak your email");
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-violet-800 uppercase">
          <Sparkles className="h-3 w-3" />
          Write with AI
        </p>
        {flash ? (
          <span className="text-[11px] font-medium text-violet-700">{flash}</span>
        ) : (
          <span className="text-[11px] text-violet-600/80">
            Voice, tone, and advanced rewrite
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggleVoice}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold",
            listening
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
          )}
        >
          <Mic className={cn("h-3.5 w-3.5", listening && "animate-pulse")} />
          {listening ? "Listening…" : "Voice"}
        </button>

        {PRIMARY_TONES.map((id) => {
          const item = EMAIL_TONES.find((t) => t.id === id)!;
          return (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => run({ nextTone: id })}
              className={cn(
                "h-8 rounded-full border px-2.5 text-[11px] font-semibold disabled:opacity-50",
                tone === id
                  ? "border-violet-300 bg-violet-100 text-violet-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
              )}
            >
              {item.label}
            </button>
          );
        })}

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
          >
            More
            <ChevronDown className="h-3 w-3" />
          </button>
          {moreOpen ? (
            <div className="absolute bottom-9 left-0 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <p className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Advanced tones
              </p>
              {EMAIL_TONES.filter((t) => !PRIMARY_TONES.includes(t.id)).map(
                (t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-violet-50"
                    onClick={() => {
                      setMoreOpen(false);
                      run({ nextTone: t.id });
                    }}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className="text-[10px] text-slate-400">{t.hint}</span>
                  </button>
                ),
              )}
              <div className="my-1 border-t border-slate-100" />
              <p className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Rewrite
              </p>
              {EMAIL_AI_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-violet-50"
                  onClick={() => {
                    setMoreOpen(false);
                    run({ action: a.id });
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => run({ action: "brief" })}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Optimize for brevity
        </button>
      </div>
    </div>
  );
}
