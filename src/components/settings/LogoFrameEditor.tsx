"use client";

import { useRef, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/settings/BrandLogo";
import {
  DEFAULT_LOGO_FRAME,
  type LogoFrame,
} from "@/lib/settings/logo-frame";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LogoFrameEditor({
  src,
  frame,
  onChange,
}: {
  src: string;
  frame: LogoFrame;
  onChange: (frame: LogoFrame) => void;
}) {
  const drag = useRef<{ x: number; y: number; frame: LogoFrame } | null>(null);

  function nudge(dx: number, dy: number) {
    onChange({
      ...frame,
      x: clamp(frame.x + dx, 0, 100),
      y: clamp(frame.y + dy, 0, 100),
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-200/80 pt-3">
      <div
        className="relative h-28 w-28 cursor-grab touch-none overflow-hidden rounded-full border border-slate-200 bg-white active:cursor-grabbing"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, frame };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const dx = ((event.clientX - start.x) / rect.width) * 100;
          const dy = ((event.clientY - start.y) / rect.height) * 100;
          onChange({
            ...start.frame,
            x: clamp(start.frame.x + dx, 0, 100),
            y: clamp(start.frame.y + dy, 0, 100),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <BrandLogo src={src} frame={frame} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            Size
            <span className="font-medium text-slate-400">
              {Math.round(frame.scale * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={frame.scale}
            onChange={(event) =>
              onChange({ ...frame, scale: Number(event.target.value) })
            }
            aria-label="Logo size"
            className="w-full accent-violet-600"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600">Move</span>
          <span className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
            <NudgeButton label="Move left" onClick={() => nudge(-4, 0)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </NudgeButton>
            <NudgeButton label="Move right" onClick={() => nudge(4, 0)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </NudgeButton>
            <NudgeButton label="Move up" onClick={() => nudge(0, -4)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </NudgeButton>
            <NudgeButton label="Move down" onClick={() => nudge(0, 4)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </NudgeButton>
          </span>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_LOGO_FRAME)}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Drag the logo, or use the arrows, to crop it. The navigation logo updates as you edit. Save changes keeps this until the next edit.
        </p>
      </div>
    </div>
  );
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-violet-700"
    >
      {children}
    </button>
  );
}
