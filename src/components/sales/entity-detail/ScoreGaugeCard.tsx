"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import type { ScoreGaugeCardProps } from "./types";
import { Panel, cn } from "./shared";

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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <Info className="h-4 w-4 text-muted-foreground/40" />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-tight text-foreground">
          {score}
        </span>
        <span className="pb-1 text-sm text-muted-foreground">/{maxScore}</span>
        {trendLabel && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium border",
              trendDirection === "up"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
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

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs">
        {bands.map((band, i) => (
          <span
            key={band.label}
            className={cn(
              "font-medium uppercase tracking-wide transition-colors",
              i === activeBandIndex
                ? "text-foreground font-semibold"
                : "text-muted-foreground/50",
            )}
          >
            {band.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}
