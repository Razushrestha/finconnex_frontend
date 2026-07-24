"use client";

import { Suspense } from "react";
import { useFocusHighlight } from "@/hooks/useFocusHighlight";

function FocusHighlightInner() {
  useFocusHighlight();
  return null;
}

/** Drop into module pages so Workqueue ?focus= deep-links highlight the record. */
export function FocusHighlight() {
  return (
    <Suspense fallback={null}>
      <FocusHighlightInner />
    </Suspense>
  );
}
