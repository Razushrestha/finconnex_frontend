"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SEGMENTS = 12;
const RINGS = 5;

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function colorAt(segment: number, ring: number): string {
  if (ring === 0) return "#FFFFFF";
  const hue = segment * 30;
  const saturation = 45 + ring * 14;
  const lightness = 88 - ring * 16;
  return hslToHex(hue, saturation, lightness);
}

function pickColorFromPoint(
  x: number,
  y: number,
  size: number,
): string | null {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = size / 2 - 2;
  if (dist > radius) return null;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const segment = Math.floor(angle / (360 / SEGMENTS)) % SEGMENTS;
  const ring = Math.min(
    RINGS - 1,
    Math.max(0, Math.floor((dist / radius) * RINGS)),
  );
  return colorAt(segment, ring);
}

function ColorWheelSvg({
  size,
  selectedColor,
  interactive,
  onPick,
}: {
  size: number;
  selectedColor?: string;
  interactive?: boolean;
  onPick?: (hex: string) => void;
}) {
  const gradientId = useId().replace(/:/g, "");
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 1;

  const slices: { d: string; fill: string; hex: string }[] = [];
  for (let ring = 0; ring < RINGS; ring++) {
    const inner = (maxR * ring) / RINGS;
    const outer = (maxR * (ring + 1)) / RINGS;
    for (let seg = 0; seg < SEGMENTS; seg++) {
      const start = (seg * 360) / SEGMENTS - 90;
      const end = ((seg + 1) * 360) / SEGMENTS - 90;
      const hex = colorAt(seg, ring);
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const x1 = cx + inner * Math.cos(toRad(start));
      const y1 = cy + inner * Math.sin(toRad(start));
      const x2 = cx + outer * Math.cos(toRad(start));
      const y2 = cy + outer * Math.sin(toRad(start));
      const x3 = cx + outer * Math.cos(toRad(end));
      const y3 = cy + outer * Math.sin(toRad(end));
      const x4 = cx + inner * Math.cos(toRad(end));
      const y4 = cy + inner * Math.sin(toRad(end));
      const large = end - start > 180 ? 1 : 0;
      const d =
        ring === 0
          ? `M ${cx} ${cy} L ${x2} ${y2} A ${outer} ${outer} 0 ${large} 1 ${x3} ${y3} Z`
          : `M ${x1} ${y1} L ${x2} ${y2} A ${outer} ${outer} 0 ${large} 1 ${x3} ${y3} L ${x4} ${y4} A ${inner} ${inner} 0 ${large} 0 ${x1} ${y1} Z`;
      slices.push({ d, fill: hex, hex });
    }
  }

  function handlePointer(e: React.MouseEvent<SVGSVGElement>) {
    if (!interactive || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const hex = pickColorFromPoint(x, y, size);
    if (hex) onPick(hex);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(
        "shrink-0 rounded-full",
        interactive && "cursor-crosshair",
      )}
      onClick={handlePointer}
      role={interactive ? "img" : undefined}
      aria-hidden={!interactive}
    >
      <defs>
        <clipPath id={gradientId}>
          <circle cx={cx} cy={cy} r={maxR} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gradientId})`}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.d}
            fill={slice.fill}
            stroke="#fff"
            strokeWidth={0.35}
            opacity={
              selectedColor &&
              slice.hex.toUpperCase() === selectedColor.toUpperCase()
                ? 1
                : 0.95
            }
          />
        ))}
      </g>
      {selectedColor ? (
        <circle
          cx={cx}
          cy={cy}
          r={maxR * 0.22}
          fill={selectedColor}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  );
}

export function ColorWheelPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={rootRef}>
      {label ? (
        <p className="truncate text-[12px] font-medium text-slate-600 dark:text-zinc-300">
          {label}
        </p>
      ) : null}
      <div className="relative inline-flex items-center gap-2">
        <button
          type="button"
          aria-label={label ? `Pick colour for ${label}` : "Pick colour"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm transition hover:border-slate-300 dark:border-zinc-600 dark:bg-zinc-800"
        >
          <ColorWheelSvg size={28} selectedColor={value} />
        </button>
        <span
          className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-zinc-400"
          title={value}
        >
          {value}
        </span>
        {open ? (
          <div className="absolute top-full left-0 z-20 mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <ColorWheelSvg
              size={132}
              selectedColor={value}
              interactive
              onPick={(hex) => {
                onChange(hex);
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
