"use client";

import { useEffect, useState } from "react";

export type ContentArea = { left: number; top: number; width: number; height: number };

/**
 * The dashboard's working area (its <main>, beside the sidebar and above the
 * bottom bar), followed as it resizes — e.g. when the sidebar collapses.
 * Dialogs lay their overlay over this so they never cover the sidebar. Null
 * while inactive, or where there is no <main> (public pages): use the whole
 * window then.
 */
export function useContentArea(active: boolean): ContentArea | null {
  const [area, setArea] = useState<ContentArea | null>(null);
  useEffect(() => {
    if (!active) return;
    const main = document.querySelector("main");
    if (!main) return;
    const measure = () => {
      const rect = main.getBoundingClientRect();
      setArea({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    // A ResizeObserver reports once as soon as it starts observing.
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);
  return active ? area : null;
}
