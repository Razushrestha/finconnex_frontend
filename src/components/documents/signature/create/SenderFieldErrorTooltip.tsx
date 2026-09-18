"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Placement = "right" | "left" | "bottom";

const TOOLTIP_WIDTH = 276;
const GAP = 14;

export function SenderFieldErrorTooltip({
  fieldId,
  fieldLabel,
}: {
  fieldId: string;
  fieldLabel: string;
}) {
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: Placement;
  } | null>(null);

  useEffect(() => {
    const target = document.getElementById(`placed-field-${fieldId}`);
    if (!target) return;

    const update = () => {
      const rect = target.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      let placement: Placement = "right";
      let left = rect.right + GAP;
      let top = rect.top + rect.height / 2;

      if (spaceRight < TOOLTIP_WIDTH + GAP + 12 && spaceLeft > spaceRight) {
        placement = "left";
        left = rect.left - GAP - TOOLTIP_WIDTH;
      }
      if (
        spaceRight < TOOLTIP_WIDTH + GAP + 12 &&
        spaceLeft < TOOLTIP_WIDTH + GAP + 12
      ) {
        placement = "bottom";
        left = Math.min(
          Math.max(12, rect.left),
          window.innerWidth - TOOLTIP_WIDTH - 12,
        );
        top = rect.bottom + GAP;
      }

      setCoords({ top, left, placement });
    };

    update();
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [fieldId]);

  if (!coords || typeof document === "undefined") return null;

  const translate =
    coords.placement === "bottom" ? undefined : "translateY(-50%)";

  return createPortal(
    <div
      role="alert"
      className="pointer-events-none fixed z-[400]"
      style={{
        top: coords.top,
        left: coords.left,
        width: TOOLTIP_WIDTH,
        transform: translate,
      }}
    >
      <div className="relative">
        {coords.placement === "right" ? (
          <span className="absolute top-1/2 -left-2 h-0 w-0 -translate-y-1/2 border-y-8 border-r-8 border-y-transparent border-r-[#f08080]" />
        ) : null}
        {coords.placement === "left" ? (
          <span className="absolute top-1/2 -right-2 h-0 w-0 -translate-y-1/2 border-y-8 border-l-8 border-y-transparent border-l-[#f08080]" />
        ) : null}
        {coords.placement === "bottom" ? (
          <span className="absolute -top-2 left-8 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[#f08080]" />
        ) : null}
        <div className="rounded-lg border border-[#f08080] bg-[#fff5f5] px-3.5 py-3 shadow-[0_8px_24px_rgba(185,28,28,0.12)]">
          <p className="text-[13px] font-semibold text-red-600">Error</p>
          <p className="mt-1 text-[13px] leading-5 text-red-500">
            Field value cannot be left empty:{" "}
            <span className="font-semibold text-red-600">{fieldLabel}</span>
          </p>
          <p className="mt-1.5 text-[11px] text-red-400">
            Click the highlighted field and enter a value.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
