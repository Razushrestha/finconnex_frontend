"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

const HIGHLIGHT_CLASS = "focus-record-pulse";
const ATTRS = [
  "data-focus-id",
  "data-task-id",
  "data-call-id",
  "data-meeting-id",
  "data-email-id",
  "data-lead-id",
  "data-contact-id",
  "data-deal-id",
  "data-reminder-id",
  "data-message-id",
  "data-note-id",
  "data-attachment-id",
] as const;

function escapeAttr(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function findFocusEl(id: string): HTMLElement | null {
  const safe = escapeAttr(id);
  for (const attr of ATTRS) {
    const el = document.querySelector<HTMLElement>(`[${attr}="${safe}"]`);
    if (el) return el;
  }
  return null;
}

function applyHighlight(el: HTMLElement) {
  el.classList.add(HIGHLIGHT_CLASS);
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  window.setTimeout(() => {
    el.classList.remove(HIGHLIGHT_CLASS);
  }, 3200);
}

/**
 * Scrolls to and briefly highlights a record when the URL has ?focus=<id>
 * (used by Workqueue row navigation).
 */
export function useFocusHighlight() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  React.useEffect(() => {
    if (!focusId) return;

    let cancelled = false;
    let attempts = 0;

    function tryFocus(onHit?: () => void) {
      if (cancelled) return true;
      const el = findFocusEl(focusId!);
      if (el) {
        applyHighlight(el);
        onHit?.();
        return true;
      }
      attempts += 1;
      return attempts > 40;
    }

    if (tryFocus()) return;

    const observer = new MutationObserver(() => {
      if (tryFocus(() => observer.disconnect())) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = window.setInterval(() => {
      if (
        tryFocus(() => {
          window.clearInterval(timer);
          observer.disconnect();
        })
      ) {
        window.clearInterval(timer);
        observer.disconnect();
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [focusId]);
}
