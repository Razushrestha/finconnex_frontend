"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TAG_TONES,
  NAMED_TAG_TONES,
  hashTagTone,
  listWorkspaceTags,
  relatedRecordTags,
  relatedTagsSectionLabel,
  toneForTag,
  writeTagColor,
  type TagToneId,
} from "@/lib/tags";

export function RecordTagChip({
  tag,
  onRemove,
  compact = false,
}: {
  tag: string;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const tone = toneForTag(tag);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center font-semibold ring-1",
        compact
          ? "h-5 gap-0.5 rounded-md px-1.5 text-[10px]"
          : "h-6 gap-1 rounded-full px-2 text-[11px]",
        tone.chip,
      )}
    >
      {compact ? null : <span className="opacity-50">#</span>}
      <span className="truncate">{tag}</span>
      {onRemove ? (
        <button
          type="button"
          title={`Remove ${tag}`}
          aria-label={`Remove ${tag}`}
          onClick={onRemove}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full opacity-60 hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

function TagRow({ tag, onPick }: { tag: string; onPick: () => void }) {
  const tone = toneForTag(tag);
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
    >
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)} />
      <span
        className={cn(
          "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
          tone.chip,
        )}
      >
        #{tag}
      </span>
    </button>
  );
}

export function RecordTagPicker({
  selected,
  relatedTo,
  onAdd,
  label = "Add Tags",
}: {
  selected: string[];
  relatedTo?: string;
  onAdd: (tag: string) => void;
  label?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createTone, setCreateTone] = useState<TagToneId>("violet");

  const selectedKeys = useMemo(
    () => new Set(selected.map((tag) => tag.toLowerCase())),
    [selected],
  );
  const related = useMemo(
    () => relatedRecordTags(relatedTo),
    [relatedTo, selected],
  );
  const catalog = useMemo(() => listWorkspaceTags(), [selected, relatedTo]);

  const availableRelated = related.filter(
    (tag) => !selectedKeys.has(tag.toLowerCase()),
  );
  const availableOther = catalog.filter(
    (tag) =>
      !selectedKeys.has(tag.toLowerCase()) &&
      !related.some((item) => item.toLowerCase() === tag.toLowerCase()),
  );

  const q = query.trim();
  const qKey = q.toLowerCase();
  const filterList = (items: string[]) =>
    qKey ? items.filter((tag) => tag.toLowerCase().includes(qKey)) : items;
  const relatedHits = filterList(availableRelated);
  const otherHits = filterList(availableOther);
  const exactExists = [...selected, ...catalog].some(
    (tag) => tag.toLowerCase() === qKey,
  );
  const canCreate = Boolean(q) && !exactExists;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCreateTone("violet");
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!q) return;
    setCreateTone(NAMED_TAG_TONES[qKey] ?? hashTagTone(q));
  }, [q, qKey]);

  function pick(tag: string, tone?: TagToneId) {
    if (tone) writeTagColor(tag, tone);
    onAdd(tag);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5A32A3] transition-opacity hover:opacity-80",
          open && "opacity-90",
        )}
      >
        <Tag className="h-3.5 w-3.5 fill-[#5A32A3] text-[#5A32A3]" />
        {label}
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-56 overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <div className="px-2 pt-2 pb-1.5">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (canCreate) pick(q, createTone);
                    else if (relatedHits[0]) pick(relatedHits[0]);
                    else if (otherHits[0]) pick(otherHits[0]);
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search tags"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {relatedHits.length ? (
              <div>
                <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {relatedTagsSectionLabel(relatedTo)}
                </p>
                {relatedHits.map((tag) => (
                  <TagRow
                    key={`related-${tag}`}
                    tag={tag}
                    onPick={() => pick(tag)}
                  />
                ))}
              </div>
            ) : null}
            {otherHits.length ? (
              <div>
                <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Existing tags
                </p>
                {otherHits.map((tag) => (
                  <TagRow
                    key={`other-${tag}`}
                    tag={tag}
                    onPick={() => pick(tag)}
                  />
                ))}
              </div>
            ) : null}
            {canCreate ? (
              <div className="border-t border-slate-100 px-3 py-2">
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Colour
                </p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {TAG_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      title={tone.id}
                      aria-label={`Use ${tone.id}`}
                      onClick={() => setCreateTone(tone.id)}
                      className={cn(
                        "h-5 w-5 rounded-full",
                        tone.dot,
                        createTone === tone.id
                          ? "ring-2 ring-[#5A32A3] ring-offset-2"
                          : "hover:scale-110",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => pick(q, createTone)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5A32A3] px-2.5 py-1.5 text-[12px] font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create “{q}”
                </button>
              </div>
            ) : null}
            {!relatedHits.length && !otherHits.length && !canCreate ? (
              <p className="px-3 py-2 text-[12px] text-slate-400">
                Type to create a tag
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RecordTagsRow({
  tags,
  onChange,
  relatedTo,
  label = "Add Tags",
}: {
  tags: string[];
  onChange?: (tags: string[]) => void;
  relatedTo?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <RecordTagChip
          key={tag}
          tag={tag}
          onRemove={
            onChange
              ? () => onChange(tags.filter((item) => item !== tag))
              : undefined
          }
        />
      ))}
      {onChange ? (
        <RecordTagPicker
          selected={tags}
          relatedTo={relatedTo}
          label={label}
          onAdd={(tag) => {
            if (tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
              return;
            }
            onChange([...tags, tag]);
          }}
        />
      ) : null}
    </div>
  );
}
