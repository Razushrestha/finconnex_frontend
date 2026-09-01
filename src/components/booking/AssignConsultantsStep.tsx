"use client";

import { useMemo, useState } from "react";
import { Camera, Info, Search } from "lucide-react";
import {
  BOOKING_CONSULTANTS,
  CONSULTANT_PRIORITIES,
  type ConsultantPriority,
} from "@/lib/booking/types";
import {
  modeSubtitle,
  type CalendarTypeChoice,
} from "@/components/booking/ConsultationDetailsStep";

const BRAND = "#5A32A3";

const EXTRA_CONSULTANTS = [
  "Akshay",
  "Admin",
  "Pawan Regmi",
  "Bishnu Aryal",
];

const ALL_NAMES = [
  ...EXTRA_CONSULTANTS,
  ...BOOKING_CONSULTANTS.map((c) => c.name).filter(
    (n) => !EXTRA_CONSULTANTS.includes(n),
  ),
];

function priorityLabel(priority: ConsultantPriority) {
  return `${priority} priority`;
}

export function AssignConsultantsStep({
  choice,
  consultationName,
  onBack,
  onCreate,
}: {
  choice: CalendarTypeChoice;
  consultationName: string;
  onBack: () => void;
  onCreate: (
    consultants: string[],
    priorities: Record<string, ConsultantPriority>,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<
    Record<string, ConsultantPriority>
  >({});
  const [error, setError] = useState("");

  const names = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAMES;
    return ALL_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const allVisibleSelected =
    names.length > 0 && names.every((n) => selected.includes(n));

  function priorityOf(name: string): ConsultantPriority {
    return priorities[name] ?? "Low";
  }

  function setPriority(name: string, priority: ConsultantPriority) {
    setPriorities((prev) => ({ ...prev, [name]: priority }));
  }

  function toggle(name: string) {
    setError("");
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  function toggleAll() {
    setError("");
    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((n) => !names.includes(n)));
      return;
    }
    setSelected((prev) => [...new Set([...prev, ...names])]);
  }

  return (
    <div className="mx-auto flex max-h-full min-h-0 w-full max-w-[720px] flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: BRAND }}
        >
          <Camera className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold uppercase text-slate-800">
            {consultationName}
          </p>
          <p className="text-[12px] text-slate-500">{modeSubtitle(choice)}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="shrink-0 px-5 pt-6 pb-4 sm:px-7">
          <div className="mb-5 flex items-center gap-2.5">
            <span
              className="h-5 w-[3px] rounded-full"
              style={{ backgroundColor: BRAND }}
            />
            <h2 className="text-[13px] font-bold tracking-[0.08em] text-slate-700 uppercase">
              Assign consultants
            </h2>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Consultants"
                className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pr-3 pl-9 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/40"
              />
            </label>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
              Select All
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
              />
            </label>
          </div>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-[#F3F4F6] overflow-y-auto border-t border-[#F3F4F6] [overflow-anchor:none]">
          {names.map((name) => {
            const checked = selected.includes(name);
            return (
              <li key={name} className="px-5 py-3.5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200/80" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-800">
                    {name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <label className="sr-only">
                      Priority for {name}
                    </label>
                    <span
                      className="hidden text-slate-400 sm:inline-flex"
                      title="Rank this consultant when assigning bookings. High priority consultants are offered first."
                    >
                      <Info className="h-3.5 w-3.5" />
                    </span>
                    <select
                      value={priorityOf(name)}
                      onChange={(e) =>
                        setPriority(name, e.target.value as ConsultantPriority)
                      }
                      className="h-9 w-[148px] rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/40"
                    >
                      {CONSULTANT_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priorityLabel(priority)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
                      aria-label={`Assign ${name}`}
                    />
                  </div>
                </div>
              </li>
            );
          })}
          {names.length === 0 ? (
            <li className="px-5 py-10 text-center text-[13px] text-slate-400">
              No consultants match your search.
            </li>
          ) : null}
        </ul>

        <div className="shrink-0 border-t border-[#E5E7EB] bg-gradient-to-b from-[#F3ECFB] to-white px-5 py-3 sm:px-7">
          <p className="truncate text-[13px] font-semibold text-slate-700">
            Consultants Assigned:
            {selected.length ? (
              <span className="ml-1.5 font-medium text-[#5A32A3]">
                {selected
                  .map((name) => `${name} (${priorityOf(name)})`)
                  .join(", ")}
              </span>
            ) : (
              <span className="ml-1.5 font-normal text-slate-400">None</span>
            )}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-center text-[12px] font-medium text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-center gap-3 pb-1">
        <button
          type="button"
          onClick={onBack}
          className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (selected.length === 0) {
              setError("Select at least one consultant");
              return;
            }
            const next: Record<string, ConsultantPriority> = {};
            for (const name of selected) next[name] = priorityOf(name);
            onCreate(selected, next);
          }}
          className="h-10 min-w-[96px] rounded-lg px-6 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
