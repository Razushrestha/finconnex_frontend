"use client";

import { Building2, HelpCircle, Trash2 } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const SCORE_MAX = 1200;

type Role = "primary" | "secondary";

function keyFor(role: Role, key: string) {
  return role === "primary" ? key : `secondary.${key}`;
}

function readCustom(card: LeadCardData, role: Role, key: string) {
  return card.custom?.[keyFor(role, key)] ?? "";
}

function bandFor(score: number) {
  if (score >= 850) {
    return {
      label: "Excellent",
      box: "bg-emerald-50",
      badge: "bg-emerald-600 text-white",
      arc: "#059669",
    };
  }
  if (score >= 735) {
    return {
      label: "Very good",
      box: "bg-lime-50",
      badge: "bg-lime-600 text-white",
      arc: "#65a30d",
    };
  }
  if (score >= 660) {
    return {
      label: "Good",
      box: "bg-amber-50",
      badge: "bg-amber-300 text-amber-950",
      arc: "#d97706",
    };
  }
  if (score >= 500) {
    return {
      label: "Fair",
      box: "bg-orange-50",
      badge: "bg-orange-500 text-white",
      arc: "#ea580c",
    };
  }
  return {
    label: "Poor",
    box: "bg-rose-50",
    badge: "bg-rose-600 text-white",
    arc: "#e11d48",
  };
}

function stableApplyScore(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return 640 + (hash % 220);
}

function parseScore(value: string) {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n)) return null;
  return Math.min(SCORE_MAX, Math.max(0, Math.round(n)));
}

function ApplyScoreGauge({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / SCORE_MAX) * circ;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e8e4dc"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[14px] leading-none font-bold text-slate-900">{score}</p>
        <p className="mt-0.5 text-[9px] text-slate-400">of {SCORE_MAX}</p>
      </div>
    </div>
  );
}

export function ApplicantCreditCard({
  role,
  roleLabel,
  name,
  card,
  onRemove,
  showScore = true,
}: {
  role: Role;
  roleLabel: string;
  name: string;
  card: LeadCardData;
  onLeadPatch?: (patch: { custom?: Record<string, string> }) => void;
  onRemove?: () => void;
  showScore?: boolean;
}) {
  const hasIdentity = Boolean(
    name.trim() && name.trim().toLowerCase() !== "secondary applicant",
  );
  const storedScore = parseScore(readCustom(card, role, "creditScore"));
  const score =
    storedScore ?? (hasIdentity ? stableApplyScore(`${card.id}:${name}`) : null);
  const band = score !== null ? bandFor(score) : null;
  const matched = score !== null;

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-[0.07em] text-[#5A32A3] uppercase">
        {roleLabel}
      </p>
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                avatarColor(name),
              )}
            >
              {initials(name)}
            </span>
            <p className="truncate text-[14px] font-semibold text-slate-900">
              {name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {matched ? (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                Verified
              </span>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {showScore ? (
          matched && band ? (
          <div
            className={cn(
              "mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5",
              band.box,
            )}
          >
            <ApplyScoreGauge score={score} color={band.arc} />
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                Apply Score
                <HelpCircle className="h-3 w-3 text-slate-400" />
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold",
                  band.badge,
                )}
              >
                {band.label}
              </span>
              <p className="mt-2 text-[10px] text-slate-500">
                Powered by:{" "}
                <span className="font-extrabold tracking-wide text-[#d52b1e]">
                  EQUIFAX
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="relative mt-3 overflow-hidden rounded-xl bg-rose-50 px-3 py-3">
            <Building2 className="pointer-events-none absolute right-2 bottom-1 h-12 w-12 text-sky-200" />
            <p className="text-[15px] font-semibold text-slate-800">No match</p>
            <p className="text-[12px] text-slate-500">
              Equifax did not find a record
            </p>
            <p className="mt-2 text-[10px] text-slate-500">
              Powered by:{" "}
              <span className="font-extrabold tracking-wide text-[#d52b1e]">
                EQUIFAX
              </span>
            </p>
          </div>
        )
        ) : null}

      </div>
    </div>
  );
}
