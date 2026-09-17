"use client";

/**
 * A searchable IANA time-zone picker.
 *
 * This was a free-text box with a placeholder, which asked the author to
 * recall an exact zone id and spell it correctly — "Asia/Katmandu" or
 * "America/NewYork" is accepted silently by the form and then rejected (or
 * worse, misinterpreted) downstream.
 *
 * The list comes from the runtime's own `Intl.supportedValuesOf`, so it is
 * always the zones this environment actually understands rather than a list
 * that drifts out of date in the repo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Every zone the runtime knows, with the browser's own zone offered first. */
export function supportedTimezones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    /* fall through to the minimal list below */
  }
  // Older runtimes have no supportedValuesOf. Offering the local zone plus
  // UTC beats offering nothing — the field still accepts a typed value.
  const local = localTimezone();
  return [...new Set([local, "UTC"].filter(Boolean))];
}

export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "GMT+5:45" for the zone, so a zone id nobody recognises still means something. */
function offsetLabel(zone: string): string {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return formatted ?? "";
  } catch {
    return "";
  }
}

export function TimezoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (zone: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const zones = useMemo(() => supportedTimezones(), []);
  const here = useMemo(() => localTimezone(), []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/\s+/g, "_");
    const pool = needle
      ? zones.filter((zone) => zone.toLowerCase().includes(needle))
      : // Unfiltered, the viewer's own zone leads — it is the likely answer.
        [here, ...zones.filter((zone) => zone !== here)];
    return pool.slice(0, 200);
  }, [zones, query, here]);

  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
        <span className="truncate text-sm text-slate-700">
          {value}
          {offsetLabel(value) && (
            <span className="ml-2 text-xs text-slate-400">{offsetLabel(value)}</span>
          )}
        </span>
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
            aria-label="Clear timezone"
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
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Search time zones..."
          className="pl-8"
        />
      </div>

      {open && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {matches.length === 0 && (
            <p className="p-3 text-xs text-slate-400">
              No time zone matches “{query}”.
            </p>
          )}
          {matches.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => {
                onChange(zone);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50",
                zone === value && "bg-blue-50/60"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-700">{zone}</span>
                {zone === here && (
                  <span className="block text-xs text-slate-400">Your time zone</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-400">{offsetLabel(zone)}</span>
                {zone === value && <Check className="h-4 w-4 text-blue-600" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
