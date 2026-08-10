"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import type { ScoreGaugeCardProps } from "./types";
import { Panel, PanelTitle, cn } from "./shared";

const BAND_FILL = ["bg-slate-300", "bg-amber-400", "bg-violet-600"] as const;

export function ScoreGaugeCard({
  title,
  score,
  maxScore = 100,
  trendLabel,
  trendDirection = "up",
  bands,
  activeBandIndex,
}: ScoreGaugeCardProps) {
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));

  return (
    <Panel>
      <PanelTitle
        action={
          <Info className="h-3.5 w-3.5 text-slate-300" aria-hidden />
        }
      >
        {title}
      </PanelTitle>

      <div className="flex items-end gap-2">
        <span className="text-[40px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
          {score}
        </span>
        <span className="pb-1 text-[13px] text-slate-400">/{maxScore}</span>
        {trendLabel && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trendDirection === "up"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            )}
          >
            {trendDirection === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendLabel} pts
          </span>
        )}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex gap-1">
        {bands.map((band, i) => (
          <div
            key={band.label}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-opacity",
              BAND_FILL[Math.min(i, BAND_FILL.length - 1)],
              i === activeBandIndex ? "opacity-100" : "opacity-35",
            )}
            title={band.label}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {bands.map((band, i) => (
          <span
            key={band.label}
            className={cn(
              i === activeBandIndex ? "text-violet-700" : "text-slate-400",
            )}
          >
            {band.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}
