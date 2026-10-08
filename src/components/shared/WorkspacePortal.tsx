"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useContentArea } from "@/hooks/useContentArea";

/**
 * Renders a dialog or side panel over the working area only: below the
 * navbar, beside the sidebar, above the bottom bar.
 *
 * Its box is fixed to the dashboard's <main> and is itself transformed, which
 * makes it the containing block for `position: fixed` descendants. So an
 * overlay written as `fixed inset-0` inside it covers the working area, not
 * the whole window. Where there is no <main> (public pages) it covers the
 * window.
 *
 * Not for popovers placed from getBoundingClientRect(): their viewport
 * coordinates would be offset by the working area. Portal those to <body>.
 */
export function WorkspacePortal({
  children,
  zIndex = 100,
}: {
  children: ReactNode;
  zIndex?: number;
}) {
  const area = useContentArea(true);
  // Without a document (server render, tests) there is nothing to portal
  // into: render the contents in place.
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(
    <div
      style={{
        position: "fixed",
        ...(area ?? { left: 0, top: 0, width: "100%", height: "100%" }),
        transform: "translateZ(0)",
        zIndex,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
