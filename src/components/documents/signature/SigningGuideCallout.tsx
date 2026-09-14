"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Box = { top: number; left: number; width: number; height: number };
type Side = "left" | "right" | "top" | "bottom";

function headerSafeTop() {
  const bar = document.querySelector<HTMLElement>("[data-sign-consent]");
  if (!bar) return 12;
  const bottom = bar.getBoundingClientRect().bottom;
  return Math.max(12, bottom + 10);
}

function fieldBox(fieldId: string): Box | null {
  const el = document.querySelector<HTMLElement>(
    `[data-signing-field="${CSS.escape(fieldId)}"]`,
  );
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function placeCallout(box: Box, tipW: number, tipH: number) {
  const pad = 10;
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minTop = headerSafeTop();
  const spaceLeft = box.left - pad;
  const spaceRight = vw - (box.left + box.width) - pad;
  const spaceBelow = vh - (box.top + box.height) - pad;
  const spaceAbove = box.top - minTop;

  let side: Side = "bottom";
  if (spaceLeft >= tipW + gap && box.top >= minTop - 8) side = "left";
  else if (spaceRight >= tipW + gap && box.top >= minTop - 8) side = "right";
  else if (spaceBelow >= tipH + gap) side = "bottom";
  else if (spaceAbove >= tipH + gap) side = "top";
  else side = spaceBelow >= spaceAbove ? "bottom" : "top";

  let left = 0;
  let top = 0;
  if (side === "left") {
    left = box.left - gap - tipW;
    top = box.top + box.height / 2 - tipH / 2;
  } else if (side === "right") {
    left = box.left + box.width + gap;
    top = box.top + box.height / 2 - tipH / 2;
  } else if (side === "top") {
    left = box.left + box.width / 2 - tipW / 2;
    top = box.top - gap - tipH;
  } else {
    left = box.left + box.width / 2 - tipW / 2;
    top = box.top + box.height + gap;
  }

  left = Math.min(vw - tipW - pad, Math.max(pad, left));
  top = Math.min(vh - tipH - pad, Math.max(minTop, top));
  return { left, top, side };
}

function fieldInView(box: Box) {
  const minTop = headerSafeTop();
  return box.top + box.height > minTop + 8 && box.top < window.innerHeight - 8;
}

function arrowClass(side: Side) {
  const base =
    "pointer-events-none absolute h-2.5 w-2.5 rotate-45 border-teal-200 bg-[#d8f3ee]";
  if (side === "left")
    return `${base} top-1/2 right-[-5px] -translate-y-1/2 border-r border-t`;
  if (side === "right")
    return `${base} top-1/2 left-[-5px] -translate-y-1/2 border-b border-l`;
  if (side === "top")
    return `${base} bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r`;
  return `${base} top-[-5px] left-1/2 -translate-x-1/2 border-l border-t`;
}

export function SigningGuideCallout({
  fieldId,
  title,
  step,
  total,
  remaining,
  onPrevious,
  onNext,
  onClose,
}: {
  fieldId: string;
  title: string;
  step: number;
  total: number;
  remaining: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    let cancelled = false;

    function measure() {
      if (cancelled) return;
      setBox(fieldBox(fieldId));
    }

    function onScrollOrResize() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    }

    const el = document.querySelector<HTMLElement>(
      `[data-signing-field="${CSS.escape(fieldId)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    measure();
    const retry = [160, 400, 800].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      cancelled = true;
      retry.forEach((id) => window.clearTimeout(id));
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [fieldId]);

  if (typeof document === "undefined" || !box) return null;

  if (!fieldInView(box)) return null;

  const tipW = 240;
  const tipH = 86;
  const { left, top, side } = placeCallout(box, tipW, tipH);

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed z-[25] rounded-md ring-2 ring-emerald-600 ring-offset-2"
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        }}
      />
      <div
        role="dialog"
        aria-label={title}
        className="fixed z-[25] w-[240px] rounded-md border border-teal-200 bg-[#d8f3ee] px-3.5 py-2.5 text-slate-800 shadow-lg"
        style={{ top, left }}
      >
        <span className={arrowClass(side)} />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-teal-100 hover:text-slate-800"
          aria-label="Close guidance"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <p className="pr-5 text-[13px] font-medium leading-snug text-slate-800">
          {title}
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[12px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={step <= 0}
            className="font-medium text-slate-700 underline decoration-slate-400 underline-offset-2 disabled:text-slate-400 disabled:no-underline"
          >
            Previous
          </button>
          <span className="px-1 text-center text-[10px] font-semibold tabular-nums text-slate-600">
            {remaining === 0
              ? "All done"
              : remaining === 1
                ? "1 left to fill"
                : `${remaining} left to fill`}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="font-medium text-slate-700 underline decoration-slate-400 underline-offset-2"
          >
            {step >= total - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
