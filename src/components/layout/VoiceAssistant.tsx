"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  interpretVoiceCommand,
  type VoiceAction,
} from "@/lib/voice/commands";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognizer(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRec;
        webkitSpeechRecognition?: new () => SpeechRec;
      }
    ).SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRec;
      }
    ).webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export function VoiceAssistant({
  open,
  onOpen,
  onClose,
  onAction,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAction: (action: VoiceAction) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [heard, setHeard] = React.useState("");
  const [status, setStatus] = React.useState("Listening…");
  const [supported, setSupported] = React.useState(true);
  const recRef = React.useRef<SpeechRec | null>(null);
  const handled = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      recRef.current?.abort();
      recRef.current = null;
      setHeard("");
      setStatus("Listening…");
      handled.current = false;
      return;
    }

    const rec = getRecognizer();
    if (!rec) {
      setSupported(false);
      setStatus("Voice isn’t available here. Type a command.");
      return;
    }

    setSupported(true);
    rec.lang = "en-AU";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim() ?? "";
      if (text) setHeard(text);
      const isFinal =
        typeof (last as { isFinal?: boolean } | undefined)?.isFinal === "boolean"
          ? (last as { isFinal?: boolean }).isFinal
          : true;
      if (text && isFinal && !handled.current) {
        handled.current = true;
        run(text);
      }
    };
    rec.onerror = () => {
      setStatus("I didn’t catch that. Tap the orb and try again.");
    };
    rec.onend = () => {
      if (!handled.current && heard) run(heard);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setStatus("Microphone is busy. Tap the orb again.");
    }

    return () => {
      rec.abort();
    };
  }, [open]);

  function run(text: string) {
    const action = interpretVoiceCommand(text);
    setStatus(action.speak);
    speak(action.speak);
    window.setTimeout(() => {
      onAction(action);
      if (action.type !== "help") onClose();
    }, 700);
  }

  function restartListen() {
    handled.current = false;
    setHeard("");
    setStatus("Listening…");
    recRef.current?.abort();
    const rec = getRecognizer();
    if (!rec) return;
    rec.lang = "en-AU";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim() ?? "";
      if (text) setHeard(text);
      if (text && (last as { isFinal?: boolean })?.isFinal && !handled.current) {
        handled.current = true;
        run(text);
      }
    };
    rec.onend = () => {
      if (!handled.current && heard) run(heard);
    };
    recRef.current = rec;
    rec.start();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Voice AI assistant"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
          "bg-gradient-to-br from-[#7C5CFF] via-[#5A32A3] to-[#2DD4BF]",
          open && "ring-2 ring-violet-300",
        )}
      >
        <Mic className="h-3.5 w-3.5" />
        {open ? (
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/40" />
        ) : null}
      </button>

      {mounted && open
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-12 z-40 flex justify-end pr-3 pb-2 sm:pr-5">
              <div className="pointer-events-auto w-[min(360px,calc(100vw-1.5rem))] rounded-3xl border border-white/20 bg-slate-950/90 px-5 py-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">
                    Voice AI
                  </p>
                  <button
                    type="button"
                    aria-label="Close voice assistant"
                    onClick={onClose}
                    className="rounded-full p-1 text-white/70 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={restartListen}
                  className="relative mx-auto flex h-28 w-28 items-center justify-center"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#7C5CFF]/30" />
                  <span className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-[#A78BFA] via-[#5A32A3] to-[#2DD4BF] opacity-80" />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#5A32A3] shadow-lg">
                    <Mic className="h-7 w-7" />
                  </span>
                </button>

                <p className="mt-4 text-center text-[13px] text-white/80">
                  {status}
                </p>
                {heard ? (
                  <p className="mt-1 text-center text-[15px] font-medium">
                    “{heard}”
                  </p>
                ) : (
                  <p className="mt-1 text-center text-[12px] text-white/45">
                    Say “open leads”, “new contact”, or “call”
                  </p>
                )}

                {!supported ? (
                  <form
                    className="mt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem(
                        "cmd",
                      ) as HTMLInputElement;
                      if (input.value.trim()) run(input.value.trim());
                    }}
                  >
                    <input
                      name="cmd"
                      autoFocus
                      placeholder="Type a command…"
                      className="h-9 w-full rounded-full border border-white/15 bg-white/10 px-3 text-[12px] outline-none placeholder:text-white/40"
                    />
                  </form>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
