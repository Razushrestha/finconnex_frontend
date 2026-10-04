"use client";

import { useState } from "react";

import { RecordTagChip } from "@/components/shared/tags/RecordTags";
import { cn } from "@/lib/utils";

/** Adds `raw` (one tag, or several separated by commas) to `tags`, skipping duplicates. */
export function addTags(tags: string[], raw: string): string[] {
  const next = [...tags];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (tag && !next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      next.push(tag);
    }
  }
  return next;
}

/**
 * Tags typed into one field: a comma or Enter turns the text into a tag chip
 * with an × to remove it, and Backspace on an empty field removes the last.
 * Text still being typed is kept when the field loses focus.
 */
export function TagListInput({
  tags,
  onChange,
  placeholder = "Type a tag and press comma",
  className,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const next = addTags(tags, raw);
    if (next.length !== tags.length) onChange(next);
    setDraft("");
  }

  return (
    <div className={cn("flex min-h-10 w-full flex-wrap items-center gap-1.5 py-1.5", className)}>
      {tags.map((tag) => (
        <RecordTagChip
          key={tag}
          tag={tag}
          recolorable={false}
          onRemove={() => onChange(tags.filter((existing) => existing !== tag))}
        />
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const value = e.target.value;
          // A comma (typed or pasted) ends a tag; whatever follows the last
          // comma stays in the field as the next tag being typed.
          if (value.includes(",")) {
            const last = value.lastIndexOf(",");
            const next = addTags(tags, value.slice(0, last));
            if (next.length !== tags.length) onChange(next);
            setDraft(value.slice(last + 1).trimStart());
            return;
          }
          setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        placeholder={tags.length ? "" : placeholder}
        aria-label="Tags"
        className="h-7 min-w-[8rem] flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
      />
    </div>
  );
}
