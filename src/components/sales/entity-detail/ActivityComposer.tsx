"use client";

import { useState } from "react";
import type { ActivityComposerProps } from "./types";
import { Panel } from "./shared";

/** Identical for Lead and Deal — just point onSubmit at the right entity id. */
export function ActivityComposer({
  placeholder = "Share a quick update, note or a log",
  onSubmit,
  submitLabel = "Post",
}: ActivityComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <Panel padded={false} className="p-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder={placeholder}
          className="flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          {submitLabel}
        </button>
      </div>
    </Panel>
  );
}
