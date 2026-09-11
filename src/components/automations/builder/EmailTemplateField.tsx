"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  getCrmEmailTemplate,
  listCrmEmailTemplates,
  type CrmEmailTemplate,
} from "@/lib/emails/api";
import { cn } from "@/lib/utils";

/**
 * Picks an email template by name.
 *
 * `templateId` is a uuid on the wire, which is not something anyone can type
 * from memory — so the field searches the workspace's active email templates
 * and stores the id behind the name.
 *
 * Nothing is fetched until something is typed: opening a step is not a
 * request for the workspace's template list, and a list nobody asked for is
 * a page of results to scroll past before typing anyway.
 */
export function EmailTemplateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (templateId: string | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CrmEmailTemplate[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  /** The saved id resolved to its name, so a re-opened step shows the name. */
  const [selected, setSelected] = useState<CrmEmailTemplate | null>(null);
  /** The id the lookup below has finished running for, hit or miss. */
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);

  const search = query.trim();
  useEffect(() => {
    if (!search) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState("loading");
      listCrmEmailTemplates({ search })
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
  }, [search]);

  // Reads the one template the step points at, not a page of candidates.
  // Null means it is gone or unreadable, which the field says plainly rather
  // than falling back to the uuid.
  useEffect(() => {
    if (!value || selected?.id === value || resolvedFor === value) return;
    let cancelled = false;
    getCrmEmailTemplate(value)
      .then((template) => {
        if (!cancelled) setSelected(template);
      })
      .finally(() => !cancelled && setResolvedFor(value));
    return () => {
      cancelled = true;
    };
  }, [value, selected?.id, resolvedFor]);

  function pick(template: CrmEmailTemplate) {
    setSelected(template);
    setResolvedFor(template.id);
    setQuery("");
    onChange(template.id);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
        <span className="flex-1 truncate">
          <span className="block truncate text-sm text-slate-700">
            {selected?.name ??
              (resolvedFor === value ? "Template no longer available" : "Loading...")}
          </span>
          {selected?.subject && (
            <span className="block truncate text-xs text-slate-400">{selected.subject}</span>
          )}
        </span>
        <button
          type="button"
          aria-label="Clear template"
          onClick={() => {
            setSelected(null);
            onChange(undefined);
          }}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates by name..."
          className="pl-8"
        />
      </div>

      {(state === "idle" || !search) && (
        <p className="p-2 text-xs text-slate-400">
          Start typing to find a template by name.
        </p>
      )}

      {search && state === "loading" && (
        <div className="flex items-center gap-2 p-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching templates...
        </div>
      )}

      {search && state === "error" && (
        <p className="rounded-md border border-dashed border-rose-200 p-2 text-xs text-rose-600">
          Couldn&apos;t load templates. Check your connection and try again.
        </p>
      )}

      {search && state === "ready" && options.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 p-2 text-xs text-slate-400">
          No active email template matches &quot;{search}&quot;.
        </p>
      )}

      {search && state === "ready" && options.length > 0 && (
        <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 p-1">
          {options.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => pick(template)}
              className={cn(
                "flex w-full flex-col rounded-md p-1.5 text-left text-sm hover:bg-slate-50",
              )}
            >
              <span className="truncate text-slate-700">{template.name}</span>
              {template.subject && (
                <span className="truncate text-xs text-slate-400">{template.subject}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
