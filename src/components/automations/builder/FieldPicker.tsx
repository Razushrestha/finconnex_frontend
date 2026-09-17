"use client";

/**
 * Chooses which field an Update Field row writes, with a search box — a lead
 * offers a dozen fields, and scrolling a plain select for "Loan Purpose" was
 * slow. Used both to change a row's field and to add a new row.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AutomationEntityType } from "@/lib/automations/types";
import { filterFieldKeys, updatableFields } from "@/lib/automations/updatable-fields";
import { cn } from "@/lib/utils";

export function FieldPicker({
  entityType,
  keys,
  value,
  taken,
  onSelect,
  variant,
}: {
  entityType: AutomationEntityType;
  /** Fields to offer, in display order. */
  keys: string[];
  /** The row's current field; omitted for the "Add field" button. */
  value?: string;
  /** Fields already used by other rows, shown but not selectable. */
  taken: ReadonlySet<string>;
  onSelect: (key: string) => void;
  variant: "row" | "add";
}) {
  const catalog = updatableFields(entityType);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => filterFieldKeys(entityType, keys, query),
    [entityType, keys, query],
  );
  const selectable = matches.filter((key) => key === value || !taken.has(key));

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  function show() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function choose(key: string) {
    setOpen(false);
    if (key !== value) onSelect(key);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(selectable.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const key = selectable[active];
      if (key) choose(key);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const activeKey = selectable[active];

  return (
    <div ref={boxRef} className={cn("relative", variant === "row" ? "w-[40%] shrink-0" : "")}>
      {variant === "row" ? (
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : show())}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-input bg-transparent px-2.5 text-left text-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{value ? (catalog[value]?.label ?? value) : "Choose field"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : show())}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search fields..."
              aria-label="Search fields"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div role="listbox" aria-label="Fields" className="max-h-60 overflow-y-auto">
            {matches.length === 0 && (
              <p className="px-2 py-3 text-xs text-slate-400">No fields match &quot;{query}&quot;.</p>
            )}
            {matches.map((key) => {
              const current = key === value;
              const disabled = !current && taken.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={current}
                  disabled={disabled}
                  onMouseEnter={() => {
                    const index = selectable.indexOf(key);
                    if (index !== -1) setActive(index);
                  }}
                  onClick={() => choose(key)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs",
                    disabled
                      ? "cursor-not-allowed text-slate-300"
                      : key === activeKey
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700",
                  )}
                >
                  <span className="truncate">{catalog[key]?.label ?? key}</span>
                  {current ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  ) : disabled ? (
                    <span className="shrink-0 text-[10px]">Added</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
