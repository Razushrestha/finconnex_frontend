"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type RelatedRecordOption = {
  kind: string;
  name: string;
};

interface RelatedRecordComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: RelatedRecordOption[];
  disabled?: boolean;
  placeholder?: string;
  allowCustom?: boolean;
  createLabel?: (name: string) => string;
  onCreateOption?: (name: string) => void;
}

export default function RelatedRecordCombobox({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Search record…",
  allowCustom = false,
  createLabel,
  onCreateOption,
}: RelatedRecordComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter(
          (record) =>
            record.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            record.kind.toLowerCase().includes(query.trim().toLowerCase()),
        );

  const MAX_RESULTS = 50;
  const visible = filtered.slice(0, MAX_RESULTS);
  const customName = query.trim();
  const canAddCustom =
    allowCustom &&
    customName.length > 0 &&
    !options.some(
      (record) => record.name.toLowerCase() === customName.toLowerCase(),
    );

  function selectRecord(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  function addCustomRecord() {
    if (!customName) return;
    if (onCreateOption) {
      onCreateOption(customName);
      setQuery(customName);
      setOpen(false);
      return;
    }
    selectRecord(customName);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "relative flex items-center rounded-md border bg-background transition-colors",
          disabled
            ? "cursor-not-allowed border-border bg-slate-50"
            : open
              ? "border-violet-300 ring-2 ring-violet-100"
              : "border-border hover:border-slate-300",
        )}
      >
        <Search
          className={cn(
            "pointer-events-none absolute left-3 h-4 w-4",
            disabled ? "text-slate-300" : "text-slate-400",
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={disabled ? "Select related entity first" : placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (event.target.value === "") onChange("");
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          className={cn(
            "h-10 w-full rounded-md bg-transparent py-2 pl-9 text-sm outline-none",
            value ? "pr-16" : "pr-9",
            disabled
              ? "cursor-not-allowed text-slate-400 placeholder:text-slate-400"
              : "text-foreground/90 placeholder:text-foreground/50",
          )}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && !disabled ? (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear related record"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4",
              disabled ? "text-slate-300" : "text-slate-400",
            )}
          />
        </div>
      </div>

      {open && !disabled && (visible.length > 0 || canAddCustom) ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
          {canAddCustom ? (
            <li>
              <button
                type="button"
                onClick={addCustomRecord}
                className="flex w-full px-3 py-2 text-left text-sm text-[#5A32A3] hover:bg-violet-50"
              >
                {createLabel
                  ? createLabel(customName)
                  : `Add “${customName}”`}
              </button>
            </li>
          ) : null}
          {visible.map((record) => {
            const selected = record.name === value;
            return (
              <li key={`${record.kind}-${record.name}`}>
                <button
                  type="button"
                  onClick={() => selectRecord(record.name)}
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-violet-50",
                    selected && "bg-violet-50",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm",
                      selected
                        ? "font-medium text-violet-700"
                        : "text-slate-800",
                    )}
                  >
                    {record.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {record.kind}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length > MAX_RESULTS ? (
            <li className="px-3 py-2 text-xs text-slate-400">
              {filtered.length - MAX_RESULTS} more — keep typing to narrow down
            </li>
          ) : null}
        </ul>
      ) : null}

      {open && !disabled && query.trim() !== "" && visible.length === 0 && !canAddCustom ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          No records match your search
        </div>
      ) : null}

      {open && !disabled && query.trim() === "" && options.length === 0 ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          {allowCustom
            ? "Type a name to add a new record"
            : "No related records available"}
        </div>
      ) : null}
    </div>
  );
}
