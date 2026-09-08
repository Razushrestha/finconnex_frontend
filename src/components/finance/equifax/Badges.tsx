import React, { ReactNode } from "react";

const TONE_STYLES = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
} as const;

export type Tone = keyof typeof TONE_STYLES;

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ tone = "slate", children, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const SCORE_BAND_TONE: Record<string, Tone> = {
  Excellent: "green",
  "Very High": "green",
  Good: "green",
  Average: "amber",
  Fair: "amber",
  Adverse: "red",
  Poor: "red",
};

interface ScoreBadgeProps {
  score: number | string;
  band: string;
}

export function ScoreBadge({ score, band }: ScoreBadgeProps) {
  const tone = SCORE_BAND_TONE[band] || "slate";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-900">{score}</span>
      <Badge tone={tone}>{band}</Badge>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { tone: Tone }> = {
  Verified: { tone: "green" },
  Conditional: { tone: "amber" },
  "High Risk": { tone: "red" },
  Pending: { tone: "slate" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { tone: "slate" };
  return (
    <Badge tone={config.tone} dot>
      {status}
    </Badge>
  );
}
