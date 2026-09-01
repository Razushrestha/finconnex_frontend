"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

export function parseStartHHmm(value: string): string {
  const start = value.split("–")[0]?.trim() ?? "";
  const ampm = start.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2];
    if (ampm[3].toUpperCase() === "PM" && hour < 12) hour += 12;
    if (ampm[3].toUpperCase() === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(start)) {
    const [hour, minute] = start.split(":");
    return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
  }
  return "";
}

export function nowHHmm() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function formatHHmmLabel(hhmm: string) {
  const parsed = parseStartHHmm(hhmm);
  if (!parsed) return "Choose a time";
  const [hour, minute] = parsed.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function partsFromHHmm(hhmm: string) {
  const parsed = parseStartHHmm(hhmm) || nowHHmm();
  const [hour, minute] = parsed.split(":").map(Number);
  return {
    hour12: hour % 12 || 12,
    minute: Number.isFinite(minute) ? minute : 0,
    period: (hour >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

function toHHmm(hour12: number, minute: number, period: "AM" | "PM") {
  let hour = hour12 % 12;
  if (period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function CustomTimePicker({
  value,
  onChange,
  displayLabel,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  displayLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280 });
  const [draft, setDraft] = useState(() => partsFromHHmm(value));

  function placePanel() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(280, rect.width);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    const below = rect.bottom + 8;
    const height = 280;
    const top =
      below + height > window.innerHeight - 8
        ? Math.max(8, rect.top - height - 8)
        : below;
    setCoords({ top, left, width });
  }

  function openPicker() {
    setDraft(partsFromHHmm(value || nowHHmm()));
    placePanel();
    setOpen(true);
  }

  function commit(next = draft) {
    onChange(toHHmm(next.hour12, next.minute, next.period));
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onReposition() {
      placePanel();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function center(scroller: HTMLDivElement | null) {
      const selected = scroller?.querySelector(
        "[data-selected='true']",
      ) as HTMLElement | null;
      if (!scroller || !selected) return;
      scroller.scrollTop =
        selected.offsetTop - scroller.clientHeight / 2 + selected.clientHeight / 2;
    }
    center(hourRef.current);
    center(minuteRef.current);
    center(periodRef.current);
  }, [open, draft.hour12, draft.minute, draft.period]);

  const label = displayLabel || formatHHmmLabel(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="relative flex h-10 w-full items-center rounded-md border border-gray-200 bg-white px-3 pr-8 text-left text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      >
        <span className={cn(!value && "text-slate-400")}>{label}</span>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[80] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
              }}
            >
              <div className="grid grid-cols-3 border-b border-slate-100">
                <Column
                  scrollerRef={hourRef}
                  items={HOURS.map((hour) => ({
                    key: String(hour),
                    label: pad2(hour),
                    selected: draft.hour12 === hour,
                  }))}
                  onSelect={(key) =>
                    setDraft((current) => ({
                      ...current,
                      hour12: Number(key),
                    }))
                  }
                />
                <Column
                  scrollerRef={minuteRef}
                  items={MINUTES.map((minute) => ({
                    key: String(minute),
                    label: pad2(minute),
                    selected: draft.minute === minute,
                  }))}
                  onSelect={(key) =>
                    setDraft((current) => ({
                      ...current,
                      minute: Number(key),
                    }))
                  }
                />
                <Column
                  scrollerRef={periodRef}
                  items={PERIODS.map((period) => ({
                    key: period,
                    label: period,
                    selected: draft.period === period,
                  }))}
                  onSelect={(key) =>
                    setDraft((current) => ({
                      ...current,
                      period: key as "AM" | "PM",
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-end gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDraft(partsFromHHmm(nowHHmm()))}
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => commit()}
                  className="h-8 rounded-md bg-blue-500 px-3 text-[13px] font-medium text-white hover:bg-blue-600"
                >
                  OK
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Column({
  items,
  onSelect,
  scrollerRef,
}: {
  items: { key: string; label: string; selected: boolean }[];
  onSelect: (key: string) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollerRef}
      className="h-[220px] overflow-y-auto border-r border-slate-100 last:border-r-0"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          data-selected={item.selected ? "true" : "false"}
          onClick={() => onSelect(item.key)}
          className={cn(
            "flex h-8 w-full items-center justify-center text-[13px]",
            item.selected
              ? "bg-blue-500 font-medium text-white"
              : "text-slate-700 hover:bg-slate-50",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
