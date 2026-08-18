"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const WAVE = [
  28, 46, 22, 70, 38, 58, 18, 82, 64, 40, 72, 30, 54, 78, 44, 26, 62, 36, 50,
  20, 48, 66, 32, 24, 56, 42, 34, 18, 60, 74, 28, 52, 16, 68, 40, 22, 58, 34,
  46, 26, 72, 38, 20, 50, 30, 64, 42, 18,
];

interface CallAudioPlayerSectionProps {
  durationSeconds: number;
  hasRecording: boolean;
}

function formatClock(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallAudioPlayerSection({
  durationSeconds,
  hasRecording,
}: CallAudioPlayerSectionProps) {
  const duration = Math.max(0, durationSeconds);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const bars = useMemo(
    () => WAVE.map((h, i) => ({ h, i, filled: i / WAVE.length <= progress })),
    [progress],
  );

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [durationSeconds]);

  useEffect(() => {
    if (!playing || duration <= 0) return;
    const id = window.setInterval(() => {
      setCurrent((t) => {
        const next = t + 0.25;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, duration]);

  function togglePlay() {
    if (!hasRecording || duration <= 0) return;
    if (current >= duration) setCurrent(0);
    setPlaying((v) => !v);
  }

  function seekTo(ratio: number) {
    if (duration <= 0) return;
    setCurrent(Math.min(duration, Math.max(0, ratio * duration)));
  }

  function skip(delta: number) {
    if (duration <= 0) return;
    setCurrent((t) => Math.min(duration, Math.max(0, t + delta)));
  }

  if (!hasRecording || duration <= 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#5A32A3]/20 bg-[#F3ECFB]/50 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">No recording yet</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Playback appears here after the call is captured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#5A32A3]/12 bg-gradient-to-b from-[#F3ECFB] to-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[#5A32A3] uppercase">
          Recording
        </p>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => skip(-15)}
            className="rounded-md px-1.5 py-0.5 hover:bg-white hover:text-[#5A32A3]"
          >
            −15s
          </button>
          <button
            type="button"
            onClick={() => skip(15)}
            className="rounded-md px-1.5 py-0.5 hover:bg-white hover:text-[#5A32A3]"
          >
            +15s
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5A32A3] text-white shadow-md shadow-[#5A32A3]/25 hover:opacity-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-end gap-[3px]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
          aria-label="Seek recording"
        >
          {bars.map((bar) => (
            <span
              key={bar.i}
              style={{ height: `${bar.h}%` }}
              className={cn(
                "w-[3px] flex-1 rounded-full transition-colors",
                bar.filled ? "bg-[#5A32A3]" : "bg-[#5A32A3]/20",
              )}
            />
          ))}
        </button>

        <div className="flex w-[118px] shrink-0 flex-col items-end gap-1">
          <p className="font-mono text-[11px] font-medium tabular-nums text-slate-600">
            {formatClock(current)}
            <span className="text-slate-400"> / {formatClock(duration)}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              className="text-slate-400 hover:text-[#5A32A3]"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const next = Number(e.target.value);
                setVolume(next);
                if (next > 0) setMuted(false);
              }}
              className="h-1 w-16 accent-[#5A32A3]"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
