"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

type Box = { top: number; left: number; width: number; height: number };

const TIP_W = 250;
const TIP_H = 68;

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

function placeCallout(box: Box) {
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minTop = headerSafeTop();
  const gap = 28;
  let left = box.left + box.width + gap;
  let top = box.top - 22;
  if (left + TIP_W > vw - pad) {
    left = Math.max(pad, box.left - gap - TIP_W);
  }
  if (top < minTop) top = minTop;
  if (top + TIP_H > vh - pad) top = Math.max(minTop, vh - TIP_H - pad);
  return { left, top };
}

function fieldInView(box: Box) {
  const minTop = headerSafeTop();
  return box.top + box.height > minTop + 8 && box.top < window.innerHeight - 8;
}

export function SigningGuideCallout({
  fieldId,
  title,
  step,
  onPrevious,
  onNext,
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

  const { left, top } = placeCallout(box);
  const onRight = left >= box.left + box.width;
  const fromX = onRight ? box.left + box.width : box.left;
  const fromY = box.top + 1;
  const elbowX = onRight ? fromX + 14 : fromX - 14;
  const toX = onRight ? left : left + TIP_W;
  const toY = top + 22;

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed z-[25] rounded-[2px] border-2 border-[#1f7a45]"
        style={{
          top: box.top - 1,
          left: box.left - 1,
          width: box.width + 2,
          height: box.height + 2,
        }}
      />
      <svg
        className="pointer-events-none fixed inset-0 z-[25] h-full w-full"
        aria-hidden
      >
        <polyline
          points={`${fromX},${fromY} ${elbowX},${fromY} ${elbowX},${toY} ${toX},${toY}`}
          fill="none"
          stroke="#9fd4b8"
          strokeWidth="1.5"
        />
      </svg>
      <div
        role="dialog"
        aria-label={title}
        className="fixed z-[26] w-[250px] rounded-[4px] border border-[#d7eee4] bg-[#f3fbf7] px-3.5 py-2.5 text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
        style={{ top, left }}
      >
        <p className="text-[14px] leading-snug text-slate-800">{title}</p>
        <div className="mt-3 flex items-center justify-end gap-4 text-[13px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={step <= 0}
            className="text-slate-800 underline underline-offset-2 disabled:text-slate-400"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            className="text-slate-800 underline underline-offset-2"
          >
            Next
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
