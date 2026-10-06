"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a full-screen overlay at the end of <body>.
 *
 * The dashboard's content column is its own stacking layer (`relative z-0`)
 * beneath the sidebar (`z-20`), so a dialog rendered inside a page can never
 * rise above the sidebar however high its z-index: the sidebar covered the
 * dialog's left edge and stayed undimmed. Rendering the overlay here puts it
 * above the whole app.
 */
export function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
