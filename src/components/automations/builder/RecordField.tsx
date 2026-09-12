"use client";

/**
 * A searchable single-record picker for an action's relation key
 * (`contactId`, `leadId`, `companyId`, `dealId`, ...).
 *
 * These were raw "Record UUID" text boxes, which asked the workflow author to
 * know an id they have no way of reading off the screen. This searches the
 * same lists the record's own create form searches, so "Contact Name" in a
 * Create Task step offers what "Contact Name" on the task page offers.
 *
 * The saved value stays the bare id string — only the input changes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  describeRelatedTarget,
  searchRelatedTargets,
  type AutomationRecordOption,
  type RelatedTarget,
} from "@/lib/automations/record-search";

export function RecordField({
  target,
  value,
  onChange,
  noun,
}: {
  target: RelatedTarget;
  value: string;
  onChange: (id: string) => void;
  noun: { one: string; many: string };
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AutomationRecordOption[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("ready");
  const [chosen, setChosen] = useState<AutomationRecordOption | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /**
   * Resolve a saved id back to its name, so reopening a step shows "Jane
   * Cooper" where it was saved rather than the bare uuid. A record that is
   * gone resolves to null and the id is shown as-is, rather than inventing a
   * label for something that no longer exists.
   */
  // A stale `chosen` from a previous value is ignored rather than cleared, so
  // nothing has to be written to state synchronously while rendering.
  const resolved = chosen?.id === value ? chosen : null;

  useEffect(() => {
    if (!value || resolved) return;
    let cancelled = false;
    describeRelatedTarget(target, value)
      .then((option) => {
        if (!cancelled && option) setChosen(option);
      })
      .catch(() => {
        /* leave the id showing rather than inventing a label */
      });
    return () => {
      cancelled = true;
    };
  }, [target, value, resolved]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState("loading");
      searchRelatedTargets(target, query)
        .then((rows) => {
          if (cancelled) return;
          setOptions(rows);
          setState("ready");
        })
        .catch(() => {
          if (!cancelled) setState("error");
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [target, query, open]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const label = useMemo(
    () => (value ? (resolved?.label ?? value) : ""),
    [resolved, value],
  );

  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
        <span className="truncate text-sm text-slate-700">{label}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            Change
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={`Clear ${noun.one}`}
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={`Search ${noun.many}...`}
          className="pl-8"
        />
      </div>

      {open && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {state === "loading" && (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading {noun.many}...
            </div>
          )}
          {state === "error" && (
            <p className="p-3 text-xs text-amber-600">
              Could not load {noun.many}. Check your connection and try again.
            </p>
          )}
          {state === "ready" && options.length === 0 && (
            <p className="p-3 text-xs text-slate-400">No {noun.many} found.</p>
          )}
          {state === "ready" &&
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setChosen(option);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
              >
                <span className="text-sm text-slate-700">{option.label}</span>
                {option.sublabel && (
                  <span className="text-xs text-slate-400">{option.sublabel}</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
