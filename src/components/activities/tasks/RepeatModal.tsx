"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export type RepeatType = "Daily" | "Weekly" | "Monthly" | "Yearly" | "Custom";
export type RepeatEnds = "never" | "after" | "on";

export interface RepeatConfig {
  type: RepeatType;
  exceptWeekendsAndHolidays: boolean;
  ends: RepeatEnds;
  afterTimes: number;
  onDate: string;
}

export const REPEAT_TYPES: RepeatType[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
  "Custom",
];

export const defaultRepeatConfig: RepeatConfig = {
  type: "Daily",
  exceptWeekendsAndHolidays: false,
  ends: "never",
  afterTimes: 1,
  onDate: "",
};

interface RepeatModalProps {
  open: boolean;
  value: RepeatConfig;
  onCancel: () => void;
  onDone: (config: RepeatConfig) => void;
}

export default function RepeatModal({
  open,
  value,
  onCancel,
  onDone,
}: RepeatModalProps) {
  const [draft, setDraft] = useState<RepeatConfig>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  function update<K extends keyof RepeatConfig>(key: K, val: RepeatConfig[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-24">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">Repeat</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Repeat type */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Repeat type</label>
            <select
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={draft.type}
              onChange={(e) => update("type", e.target.value as RepeatType)}
            >
              {REPEAT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Except weekends */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={draft.exceptWeekendsAndHolidays}
              onChange={(e) =>
                update("exceptWeekendsAndHolidays", e.target.checked)
              }
            />
            Except weekends and holidays.
          </label>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-700 mb-2">Ends</p>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="repeat-ends"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  checked={draft.ends === "never"}
                  onChange={() => update("ends", "never")}
                />
                Never
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="repeat-ends"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  checked={draft.ends === "after"}
                  onChange={() => update("ends", "after")}
                />
                After
                <input
                  type="number"
                  min={1}
                  disabled={draft.ends !== "after"}
                  value={draft.afterTimes}
                  onChange={(e) =>
                    update("afterTimes", Number(e.target.value) || 1)
                  }
                  className="w-14 rounded-md border border-gray-200 px-2 py-1 text-sm text-center disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                Times
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="repeat-ends"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  checked={draft.ends === "on"}
                  onChange={() => update("ends", "on")}
                />
                On
                <input
                  type="date"
                  disabled={draft.ends !== "on"}
                  value={draft.onDate}
                  onChange={(e) => update("onDate", e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDone(draft)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
