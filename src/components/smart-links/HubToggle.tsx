"use client";

import { cn } from "@/lib/utils";

interface HubToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function HubToggle({ checked, onChange, label }: HubToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "Toggle"}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none",
        checked ? "bg-emerald-500" : "bg-border",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
