import React from "react";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Segment {
  tone: string;
  label: string;
}

interface ScoreGaugeCardProps {
  label?: string;
  score: number;
  maxScore?: number;
  band: string;
  bandVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
  segments?: Segment[];
  footerLeft?: string;
  footerRight?: string;
}

export default function ScoreGaugeCard({
  label = "EQUIFAX COMMERCIAL SCORE",
  score,
  maxScore = 1000,
  band,
  bandVariant = "outline",
  segments = [
    { tone: "rose", label: "0 (Adverse)" },
    { tone: "amber", label: "500 (Fair)" },
    { tone: "emerald", label: "785 (Current)" },
    { tone: "violet", label: "1000 (Prime)" },
  ],
  footerLeft,
  footerRight,
}: ScoreGaugeCardProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-slate-900">{score}</span>
          <span className="text-sm font-medium text-slate-400">
            / {maxScore}
          </span>
          <Badge
            variant={bandVariant}
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            {band}
          </Badge>
        </div>
      </div>

      <div className="my-auto py-4">
        <div className="relative">
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="h-full flex-1 bg-rose-400" />
            <div className="h-full flex-1 bg-amber-400" />
            <div className="h-full flex-1 bg-emerald-400" />
            <div className="h-full flex-1 bg-violet-400" />
          </div>
          <div
            className="absolute -top-1 h-4 w-1.5 rounded-full bg-slate-900"
            style={{ left: `calc(${pct}% - 3px)` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          {segments.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </div>

      {(footerLeft || footerRight) && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          {footerLeft && (
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              ✓ {footerLeft}
            </span>
          )}
          {footerRight && <span className="text-slate-500">{footerRight}</span>}
        </div>
      )}
    </div>
  );
}
