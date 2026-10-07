"use client";

import * as React from "react";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

function parseInitialColor(raw: string) {
  const fallback = "#4F1919";
  const value =
    !raw || raw === "transparent"
      ? fallback
      : raw.startsWith("#")
        ? raw
        : `#${raw}`;
  const rgb = hexToRgb(value);
  if (!rgb) {
    return { ...rgbToHsv(79, 25, 25), hex: fallback, alpha: 100 };
  }
  return {
    ...rgbToHsv(rgb.r, rgb.g, rgb.b),
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    alpha: 100,
  };
}

export function AdvancedColorPicker({
  initialColor,
  onBack,
  onDone,
}: {
  initialColor: string;
  onBack: () => void;
  onDone: (color: string) => void;
}) {
  const start = parseInitialColor(initialColor);
  const [hue, setHue] = React.useState(start.h);
  const [sat, setSat] = React.useState(start.s);
  const [val, setVal] = React.useState(start.v);
  const [alpha, setAlpha] = React.useState(start.alpha);
  const [hex, setHex] = React.useState(start.hex);
  const svRef = React.useRef<HTMLDivElement>(null);
  const hueRef = React.useRef<HTMLDivElement>(null);
  const alphaRef = React.useRef<HTMLDivElement>(null);
  const hsvRef = React.useRef({ h: hue, s: sat, v: val });
  hsvRef.current = { h: hue, s: sat, v: val };

  const solid = hsvToHex(hue, sat, val);
  const rgb = hsvToRgb(hue, sat, val);
  const preview =
    alpha >= 100
      ? solid
      : `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha / 100})`;

  function applyHsv(nextH: number, nextS: number, nextV: number) {
    setHue(nextH);
    setSat(nextS);
    setVal(nextV);
    setHex(hsvToHex(nextH, nextS, nextV));
  }

  function syncFromHex(raw: string) {
    const cleaned = raw.trim();
    const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    const nextRgb = hexToRgb(withHash);
    if (!nextRgb) return;
    const next = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    setHue(next.h);
    setSat(next.s);
    setVal(next.v);
    setHex(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }

  function bindDrag(
    ref: React.RefObject<HTMLDivElement | null>,
    onMove: (clientX: number, clientY: number, rect: DOMRect) => void,
  ) {
    return (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const el = ref.current;
      if (!el) return;
      el.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        onMove(ev.clientX, ev.clientY, rect);
      };
      const up = (ev: PointerEvent) => {
        el.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      move(event.nativeEvent);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const hueColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div
      data-more-colours=""
      className="w-[260px] px-3 pt-3 pb-3"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        ref={svRef}
        className="relative h-[150px] w-full cursor-crosshair overflow-hidden rounded-md"
        style={{ backgroundColor: hueColor }}
        onPointerDown={bindDrag(svRef, (x, y, rect) => {
          const s = clamp01((x - rect.left) / rect.width);
          const v = clamp01(1 - (y - rect.top) / rect.height);
          applyHsv(hsvRef.current.h, s, v);
        })}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#fff,transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#000,transparent)]" />
        <span
          aria-hidden
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div
            ref={hueRef}
            className="relative h-3 w-full cursor-pointer rounded-full"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
            onPointerDown={bindDrag(hueRef, (x, _y, rect) => {
              const nextH = clamp01((x - rect.left) / rect.width) * 360;
              applyHsv(nextH, hsvRef.current.s, hsvRef.current.v);
            })}
          >
            <span
              aria-hidden
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{ left: `${(hue / 360) * 100}%` }}
            />
          </div>
          <div
            ref={alphaRef}
            className="relative h-3 w-full cursor-pointer overflow-hidden rounded-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, transparent, ${solid}),
                linear-gradient(45deg, #d4d4d8 25%, transparent 25%),
                linear-gradient(-45deg, #d4d4d8 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #d4d4d8 75%),
                linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)
              `,
              backgroundSize: "100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px",
              backgroundPosition: "0 0, 0 0, 0 4px, 4px -4px, -4px 0",
              backgroundColor: "#fff",
            }}
            onPointerDown={bindDrag(alphaRef, (x, _y, rect) => {
              setAlpha(Math.round(clamp01((x - rect.left) / rect.width) * 100));
            })}
          >
            <span
              aria-hidden
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{ left: `${alpha}%`, backgroundColor: preview }}
            />
          </div>
        </div>
        <span
          aria-hidden
          className="h-10 w-10 shrink-0 rounded-full border border-slate-200 shadow-inner"
          style={{ backgroundColor: preview }}
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-600">
          HEX
        </span>
        <input
          type="text"
          value={hex}
          spellCheck={false}
          aria-label="Hex colour"
          onChange={(event) => setHex(event.target.value)}
          onBlur={() => syncFromHex(hex)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              syncFromHex(hex);
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 font-mono text-[12px] text-slate-800 outline-none focus:border-violet-400"
        />
        <label className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-500">
          Alpha
          <input
            type="number"
            min={0}
            max={100}
            value={alpha}
            onChange={(event) =>
              setAlpha(
                Math.min(100, Math.max(0, Number(event.target.value) || 0)),
              )
            }
            className="w-9 border-0 bg-transparent text-right text-[12px] text-slate-800 outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onBack}
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const cleaned = hex.trim();
            const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
            const parsed = hexToRgb(withHash);
            if (parsed) {
              onDone(rgbToHex(parsed.r, parsed.g, parsed.b));
              return;
            }
            onDone(
              hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v),
            );
          }}
          className="h-8 rounded-md bg-[#5B9BD5] px-3.5 text-[12px] font-semibold text-white hover:opacity-90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
