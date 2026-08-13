"use client";

import { useMemo, useState } from "react";
import { Aperture, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_CONSULTANTS } from "@/lib/booking/types";
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

export function AssignConsultantsStep({
  choice,
  consultationName,
  onBack,
  onCreate,
}: {
  choice: CalendarTypeChoice;
  consultationName: string;
  onBack: () => void;
  onCreate: (consultants: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const names = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAMES;
    return ALL_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const allVisibleSelected =
    names.length > 0 && names.every((n) => selected.includes(n));

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
    <div className="mx-auto w-full max-w-[720px] pb-8">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: BRAND }}
        >
          <Aperture className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold uppercase text-slate-800">
            {consultationName}
          </p>
          <p className="text-[12px] text-slate-500">{modeSubtitle(choice)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="px-5 pt-6 pb-4 sm:px-7">
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

        <ul className="divide-y divide-[#F3F4F6] border-t border-[#F3F4F6]">
          {names.map((name) => {
            const checked = selected.includes(name);
            return (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-3 px-5 py-3.5 sm:px-7">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200/80" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-800">
                    {name}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(name)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
                  />
                </label>
              </li>
            );
          })}
          {names.length === 0 ? (
            <li className="px-5 py-10 text-center text-[13px] text-slate-400">
              No consultants match your search.
            </li>
          ) : null}
        </ul>

        <div className="border-t border-[#E5E7EB] bg-gradient-to-b from-[#F3ECFB] to-white px-5 py-4 sm:px-7">
          <p className="text-[13px] font-semibold text-slate-700">
            Consultants Assigned:
            {selected.length ? (
              <span className="ml-1.5 font-medium text-[#5A32A3]">
                {selected.join(", ")}
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

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
            onCreate(selected);
          }}
          className="h-10 rounded-lg px-5 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Create Consultation
        </button>
      </div>
    </div>
  );
}
