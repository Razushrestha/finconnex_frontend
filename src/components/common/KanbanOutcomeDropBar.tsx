"use client";

import type { CSSProperties, ReactNode } from "react";
import { Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Outcome = "won" | "lost";

export function KanbanOutcomeDropBar({
  over,
  onOver,
  onLeave,
  onDrop,
  wonLabel = "Win",
  lostLabel = "Lost",
  style,
}: {
  over: Outcome | null;
  onOver: (outcome: Outcome) => void;
  onLeave: (outcome: Outcome) => void;
  onDrop: (outcome: Outcome) => void;
  wonLabel?: string;
  lostLabel?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-5 z-50 px-5"
      style={style}
    >
      <div className="mx-auto grid w-full max-w-[920px] grid-cols-2 gap-3">
        <OutcomeTile
          outcome="won"
          active={over === "won"}
          label={wonLabel}
          hint="Drop here to close as won"
          icon={<Trophy className="h-4 w-4" />}
          onOver={onOver}
          onLeave={onLeave}
          onDrop={onDrop}
        />
        <OutcomeTile
          outcome="lost"
          active={over === "lost"}
          label={lostLabel}
          hint="Drop here to close as lost"
          icon={<XCircle className="h-4 w-4" />}
          onOver={onOver}
          onLeave={onLeave}
          onDrop={onDrop}
        />
      </div>
    </div>
  );
}

function OutcomeTile({
  outcome,
  active,
  label,
  hint,
  icon,
  onOver,
  onLeave,
  onDrop,
}: {
  outcome: Outcome;
  active: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onOver: (outcome: Outcome) => void;
  onLeave: (outcome: Outcome) => void;
  onDrop: (outcome: Outcome) => void;
}) {
  const won = outcome === "won";

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onOver(outcome);
      }}
      onDragLeave={() => onLeave(outcome)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(outcome);
      }}
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-all",
        won
          ? active
            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
            : "border-emerald-200/80"
          : active
            ? "border-rose-400 bg-rose-50 ring-2 ring-rose-200"
            : "border-rose-200/80",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          won
            ? active
              ? "bg-emerald-600 text-white"
              : "bg-emerald-100 text-emerald-700"
            : active
              ? "bg-rose-600 text-white"
              : "bg-rose-100 text-rose-700",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[13px] font-semibold",
            won ? "text-emerald-800" : "text-rose-800",
          )}
        >
          {label}
        </p>
        <p className="truncate text-[11px] text-slate-500">{hint}</p>
      </div>
    </div>
  );
}
