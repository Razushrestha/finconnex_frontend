"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowTag } from "@/components/common/ArrowTag";
import {
  TAG_TONES,
  NAMED_TAG_TONES,
  hashTagTone,
  listWorkspaceTags,
  onTagColorsChange,
  relatedRecordTags,
  relatedTagsSectionLabel,
  toneForTag,
  writeTagColor,
  type TagToneId,
} from "@/lib/tags";

function TagColorDots({
  value,
  onChange,
}: {
  value: TagToneId;
  onChange: (tone: TagToneId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          title={tone.id}
          aria-label={`Use ${tone.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onChange(tone.id);
          }}
          className={cn(
            "h-5 w-5 rounded-full",
            value === tone.id
              ? "ring-2 ring-[#5A32A3] ring-offset-2"
              : "hover:scale-110",
          )}
          style={{ backgroundColor: tone.color }}
        />
      ))}
    </div>
  );
}

export function RecordTagChip({
  tag,
  onRemove,
  compact = false,
  recolorable = true,
}: {
  tag: string;
  onRemove?: () => void;
  compact?: boolean;
  recolorable?: boolean;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [toneId, setToneId] = useState<TagToneId>(() => toneForTag(tag).id);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setToneId(toneForTag(tag).id);
    return onTagColorsChange(() => setToneId(toneForTag(tag).id));
  }, [tag]);

  useEffect(() => {
    if (!paletteOpen) return;
    function onDoc(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setPaletteOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [paletteOpen]);

  const tone = TAG_TONES.find((item) => item.id === toneId) ?? TAG_TONES[0];

  return (
    <span className="relative inline-flex max-w-full" ref={wrapRef}>
      <ArrowTag
        compact={compact}
        color={tone.color}
        className={cn(
          recolorable && "cursor-pointer",
          onRemove && "fc-arrow-tag-removable",
        )}
        title={recolorable ? `Change colour for ${tag}` : tag}
        onClick={
          recolorable
            ? (event) => {
                event.stopPropagation();
                setPaletteOpen((open) => !open);
              }
            : undefined
        }
      >
        <span className="truncate">{tag}</span>
      </ArrowTag>
      {onRemove ? (
        <button
          type="button"
          title={`Remove ${tag}`}
          aria-label={`Remove ${tag}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute top-1/2 right-3 z-10 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
      {paletteOpen ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-44 rounded-xl bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Colour
          </p>
          <TagColorDots
            value={toneId}
            onChange={(next) => {
              writeTagColor(tag, next);
              setToneId(next);
              setPaletteOpen(false);
            }}
          />
        </div>
      ) : null}
    </span>
  );
}

function TagRow({ tag, onPick }: { tag: string; onPick: () => void }) {
  const [toneId, setToneId] = useState<TagToneId>(() => toneForTag(tag).id);
  useEffect(() => {
    setToneId(toneForTag(tag).id);
    return onTagColorsChange(() => setToneId(toneForTag(tag).id));
  }, [tag]);
  const tone = TAG_TONES.find((item) => item.id === toneId) ?? TAG_TONES[0];
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone.color }}
      />
      <ArrowTag compact color={tone.color}>
        <span className="truncate">{tag}</span>
      </ArrowTag>
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
                <div className="mb-2">
                  <TagColorDots value={createTone} onChange={setCreateTone} />
                </div>
                <div className="mb-2">
                  <ArrowTag
                    compact
                    color={
                      TAG_TONES.find((item) => item.id === createTone)?.color
                    }
                  >
                    {q}
                  </ArrowTag>
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
