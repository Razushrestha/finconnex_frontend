"use client";

import { runOutcomeCounts } from "@/lib/automations/run-log";

const CARDS = [
  { key: "succeeded", label: "Success", tone: "to-emerald-50/70", text: "text-emerald-700" },
  { key: "running", label: "Running", tone: "to-amber-50/80", text: "text-amber-700" },
  { key: "failed", label: "Fails", tone: "to-rose-50/80", text: "text-rose-700" },
] as const;

/**
 * Success / Running / Fails for a set of runs — one trigger's in the builder,
 * every workflow's on the logs page. Same card as the Payments metrics row:
 * white fading into a soft tint.
 */
export function RunOutcomeCards({
  byStatus,
}: {
  byStatus: Partial<Record<string, number>> | undefined;
}) {
  const counts = runOutcomeCounts(byStatus);
  return (
    <div className="grid grid-cols-3 gap-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white p-5 shadow-sm ${card.tone}`}
        >
          <div className={`text-3xl font-semibold ${card.text}`}>{counts[card.key]}</div>
          <div className={`mt-0.5 text-xs font-medium ${card.text} opacity-80`}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}
