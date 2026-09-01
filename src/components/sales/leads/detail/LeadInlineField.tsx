"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LeadInlineField({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Add…",
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next !== value.trim()) onSave(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "block w-full truncate rounded-md text-left hover:bg-violet-50/80",
          !value && "text-slate-400",
          className,
        )}
        title="Click to edit — every change is saved to Timeline"
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn(
        "w-full rounded-md border border-[#5A32A3]/30 bg-white px-1.5 py-0.5 outline-none focus:border-[#5A32A3]",
        inputClassName,
      )}
    />
  );
}
