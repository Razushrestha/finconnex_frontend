"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMAIL_TONES, htmlToPlainText, type EmailTone } from "@/lib/emails/ai-compose";
import { requestEmailAi } from "@/lib/emails/request-email-ai";

interface EmailAiAssistProps {
  html: string;
  onChange: (html: string) => void;
  recipientName?: string;
  subject?: string;
}

type SpeechResultList = ArrayLike<{ isFinal?: boolean } & ArrayLike<{ transcript: string }>>;

type SpeechRec = {
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: { resultIndex: number; results: SpeechResultList }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

const VOICE_PAUSE_MS = 2000;

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
  const listeningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef("");
  const committedRef = useRef("");
  const pauseTimerRef = useRef<number | null>(null);
  const lastHeardAtRef = useRef(0);

  function clearPauseTimer() {
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopRequestedRef.current = true;
      listeningRef.current = false;
      clearPauseTimer();
      recRef.current?.stop();
    };
  }, []);

  function notice(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  }

  async function writeFromPrompt(text: string) {
    const next = text.trim();
    if (!next) return;
    setBusy(true);
    try {
      const drafted = await requestEmailAi({
        mode: htmlToPlainText(html) ? "edit" : "draft",
        prompt: next,
        html,
        tone,
        recipientName,
        subject,
      });
      onChange(drafted);
      setOpen(false);
      notice("Draft written");
    } catch (err) {
      notice(err instanceof Error ? err.message : "Could not write this email");
    } finally {
      setBusy(false);
    }
  }

  async function shorten() {
    setBusy(true);
    try {
      onChange(
        await requestEmailAi({
          mode: "rewrite",
          html,
          tone,
          action: "brief",
          recipientName,
          subject,
        }),
      );
      notice("Shortened");
    } catch (err) {
      notice(err instanceof Error ? err.message : "Could not shorten this email");
    } finally {
      setBusy(false);
    }
  }

  function finishVoice() {
    stopRequestedRef.current = true;
    listeningRef.current = false;
    clearPauseTimer();
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    const said = transcriptRef.current.trim();
    transcriptRef.current = "";
    committedRef.current = "";
    if (said) {
      notice("Writing email…");
      void writeFromPrompt(said);
    } else {
      notice("No speech heard");
    }
  }

  function markHeard() {
    lastHeardAtRef.current = Date.now();
    armPauseTimer();
  }

  function stillInPauseWindow() {
    return Date.now() - lastHeardAtRef.current < VOICE_PAUSE_MS;
  }

  function armPauseTimer() {
    clearPauseTimer();
    pauseTimerRef.current = window.setTimeout(() => {
      finishVoice();
    }, VOICE_PAUSE_MS);
  }

  function toggleVoice() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      notice("Voice is not supported in this browser");
      return;
    }
    if (listeningRef.current) {
      finishVoice();
      return;
    }

    stopRequestedRef.current = false;
    transcriptRef.current = "";
    committedRef.current = "";
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-AU";
    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const row = event.results[i];
        const text = row[0]?.transcript ?? "";
        if (row.isFinal) finals += `${text} `;
        else interim = text;
      }
      const next = `${committedRef.current} ${finals}${interim}`
        .replace(/\s+/g, " ")
        .trim();
      if (!next) return;
      transcriptRef.current = next;
      markHeard();
    };
    rec.onspeechstart = () => markHeard();
    rec.onspeechend = () => armPauseTimer();
    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        if (!stillInPauseWindow()) finishVoice();
        return;
      }
      stopRequestedRef.current = true;
      listeningRef.current = false;
      clearPauseTimer();
      setListening(false);
    };
    rec.onend = () => {
      if (stopRequestedRef.current || !listeningRef.current) return;
      if (!stillInPauseWindow()) {
        finishVoice();
        return;
      }
      committedRef.current = transcriptRef.current;
      try {
        rec.start();
      } catch {
        armPauseTimer();
      }
    };
    recRef.current = rec;
    listeningRef.current = true;
    lastHeardAtRef.current = Date.now();
    rec.start();
    setListening(true);
    armPauseTimer();
    notice("Listening… stop after 2s silence");
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
