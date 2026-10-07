"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

import {
  allTimezoneOptions,
  currentZoneName,
  timezoneOptionLabel,
  type TimezoneOption,
} from "@/lib/booking/all-timezones";
import { cn } from "@/lib/utils";

/**
 * Searchable time zone picker over every IANA zone, labelled with its UTC
 * offset ("UTC+05:45 · Asia/Kathmandu"). Search matches a city or region
 * ("kath", "sydney"), the offset ("5:45", "+11", "utc-3") or the zone name.
 *
 * The list is drawn at the end of <body> with fixed coordinates, so a card
 * that clips its overflow or a scrolling form cannot cut it off.
 */
const NO_EXTRA_ZONES: string[] = [];

export function TimeZonePicker({
  value,
  onChange,
  ariaLabel = "Time zone",
  className,
  extraZones = NO_EXTRA_ZONES,
  hideChevron = false,
  id,
}: {
  /** IANA zone, e.g. "Australia/Sydney". */
  value: string;
  onChange: (zone: string) => void;
  ariaLabel?: string;
  /** Classes for the trigger, so each layout can keep its own look. */
  className?: string;
  /** Zones to list even if this browser spells them differently. */
  extraZones?: string[];
  /** For a container that already draws its own arrow. */
  hideChevron?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [menuAt, setMenuAt] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = currentZoneName(value);
  const options = useMemo(
    () => allTimezoneOptions([selected, ...extraZones]),
    [selected, extraZones],
  );
  const matches = useMemo(() => filterZones(options, query), [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setMenuAt(null);
  }

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 4;
    const below = window.innerHeight - rect.bottom - gap - 8;
    const above = rect.top - gap - 8;
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    if (below >= 260 || below >= above) {
      setMenuAt({ left, width, top: rect.bottom + gap, maxHeight: Math.max(180, below) });
    } else {
      setMenuAt({
        left,
        width,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(180, above),
      });
    }
  }

  function openMenu() {
    place();
    setActive(Math.max(0, options.findIndex((row) => row.value === selected)));
    setOpen(true);
  }

  function pick(row: TimezoneOption) {
    onChange(row.value);
    close();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      setMenuAt(null);
    }
    function onMove(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        setQuery("");
        setMenuAt(null);
        return;
      }
      place();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-label={`${ariaLabel}: ${timezoneOptionLabel(selected)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-timezone={selected}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-[14px] text-slate-700 outline-none focus:border-[var(--booking-brand,var(--brand-primary))]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{timezoneOptionLabel(selected)}</span>
        {hideChevron ? null : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        )}
      </button>
      {open && menuAt && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: menuAt.left,
                width: menuAt.width,
                top: menuAt.top,
                bottom: menuAt.bottom,
                maxHeight: menuAt.maxHeight,
              }}
              className="z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      close();
                      triggerRef.current?.focus();
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActive((i) => Math.min(i + 1, matches.length - 1));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActive((i) => Math.max(i - 1, 0));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const row = matches[active] ?? matches[0];
                      if (row) pick(row);
                    }
                  }}
                  placeholder="Search city, region or UTC offset"
                  aria-label="Search time zones"
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-3 pl-8 text-[13px] text-slate-800 outline-none focus:border-slate-300"
                />
              </div>
              <ul
                ref={listRef}
                role="listbox"
                aria-label="Time zones"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
              >
                {matches.map((row, index) => (
                  <li
                    key={row.value}
                    role="option"
                    aria-selected={row.value === selected}
                    data-index={index}
                  >
                    <button
                      type="button"
                      onClick={() => pick(row)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        "flex w-full items-center px-3 py-2 text-left text-[13px]",
                        row.value === selected
                          ? "font-semibold text-[var(--booking-brand,var(--brand-primary))]"
                          : "text-slate-700",
                        index === active && "bg-slate-50",
                      )}
                    >
                      <span className="min-w-0 truncate">{row.label}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 ? (
                  <li className="px-3 py-4 text-[12px] text-slate-400">
                    No time zone matches “{query}”
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Zones matching a search. "5:45", "+5:45", "utc+5" and "gmt-3" match by
 * offset; anything else matches the zone name or its label, spaces and
 * underscores alike.
 */
export function filterZones(options: TimezoneOption[], query: string): TimezoneOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const offset = /^(?:utc|gmt)?\s*([+-])?\s*(\d{1,2})(?::?(\d{2}))?$/.exec(q);
  if (offset) {
    const hours = Number(offset[2]);
    const minutes = Number(offset[3] ?? 0);
    const signs = offset[1] ? [offset[1] === "-" ? -1 : 1] : [1, -1];
    const wanted = new Set(signs.map((sign) => sign * (hours * 60 + minutes)));
    const byOffset = options.filter((row) => wanted.has(row.offsetMinutes));
    if (byOffset.length) return byOffset;
  }
  const needle = q.replace(/_/g, " ");
  return options.filter((row) => row.label.toLowerCase().replace(/_/g, " ").includes(needle));
}
