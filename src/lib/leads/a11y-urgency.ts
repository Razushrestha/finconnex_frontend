/**
 * Lead Card urgency tokens + WCAG contrast contracts (AA).
 * Shared by Kanban card, list view, and CI contrast checks.
 */

import type { ActivityUrgency } from "@/lib/leads/card-types";

/** Tailwind v4 default palette hex (locked for contrast math). */
export const URGENCY_HEX = {
  red: {
    surface: "#fef2f2", // red-50
    text: "#991b1b", // red-800
    icon: "#b91c1c", // red-700
    badge: "#b91c1c", // red-700
  },
  amber: {
    surface: "#fffbeb", // amber-50
    text: "#78350f", // amber-900
    icon: "#b45309", // amber-700
    badge: "#92400e", // amber-800
  },
  green: {
    surface: "#ecfdf5", // emerald-50
    text: "#065f46", // emerald-800
    icon: "#047857", // emerald-700
    badge: "#047857", // emerald-700
  },
  neutral: {
    icon: "#94a3b8", // slate-400
    badge: "#94a3b8",
  },
  white: "#ffffff",
} as const;

/** Tailwind class tokens used in UI (must match URGENCY_HEX). */
export const URGENCY_SURFACE: Record<ActivityUrgency, string> = {
  red: "bg-red-50 text-red-800",
  amber: "bg-amber-50 text-amber-900",
  green: "bg-emerald-50 text-emerald-800",
};

export const URGENCY_TEXT: Record<ActivityUrgency, string> = {
  red: "text-red-800",
  amber: "text-amber-900",
  green: "text-emerald-800",
};

export const QUICK_URGENCY: Record<ActivityUrgency | "neutral", string> = {
  red: "text-red-700 hover:bg-red-50",
  amber: "text-amber-700 hover:bg-amber-50",
  green: "text-emerald-700 hover:bg-emerald-50",
  neutral: "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
};

export const QUICK_BADGE: Record<ActivityUrgency | "neutral", string> = {
  red: "bg-red-700 text-white",
  amber: "bg-amber-800 text-white",
  green: "bg-emerald-700 text-white",
  neutral: "bg-slate-400 text-white",
};

/** Spoken / aria labels — never rely on color alone. */
export const URGENCY_WORDS: Record<ActivityUrgency, string> = {
  red: "Needs attention",
  amber: "Due today",
  green: "On track",
};

export const QUICK_STATE_WORDS: Record<ActivityUrgency | "neutral", string> = {
  red: "needs attention",
  amber: "due today",
  green: "scheduled ahead",
  neutral: "no pending items",
};

/** Manual QA checklist for keyboard + screen reader passes. */
export const LEAD_CARD_A11Y_CHECKLIST = [
  "Tab reaches Activity Summary, Last Activity, and all 7 quick actions",
  "Enter/Space activates summary, last activity, and each quick action",
  "Focus rings visible (ring-2) on interactive card controls",
  "Activity Summary aria-label includes urgency words (not color-only)",
  "Quick action aria-label includes state words + pending count",
  "Dialog has DialogTitle + DialogDescription (sr-only ok)",
  "Red/amber/green surfaces meet WCAG AA (≥4.5:1) for summary text",
  "Badge white-on-urgency meets WCAG AA (≥4.5:1) for badge numerals",
  "Drag handle / card drag does not trap keyboard focus",
  "List view exposes the same toolbar semantics as the Kanban card",
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** WCAG relative contrast ratio (1–21). */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relLuminance(hexToRgb(fgHex));
  const l2 = relLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_UI = 3;

export type ContrastPairCheck = {
  id: string;
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
};

/** All urgency pairs that must pass for Lead Card shipping. */
export function checkUrgencyContrast(): ContrastPairCheck[] {
  const pairs: { id: string; fg: string; bg: string; min: number }[] = [
    {
      id: "red-summary-text",
      fg: URGENCY_HEX.red.text,
      bg: URGENCY_HEX.red.surface,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "amber-summary-text",
      fg: URGENCY_HEX.amber.text,
      bg: URGENCY_HEX.amber.surface,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "green-summary-text",
      fg: URGENCY_HEX.green.text,
      bg: URGENCY_HEX.green.surface,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "red-badge",
      fg: URGENCY_HEX.white,
      bg: URGENCY_HEX.red.badge,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "amber-badge",
      fg: URGENCY_HEX.white,
      bg: URGENCY_HEX.amber.badge,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "green-badge",
      fg: URGENCY_HEX.white,
      bg: URGENCY_HEX.green.badge,
      min: WCAG_AA_NORMAL,
    },
    {
      id: "red-icon-on-white",
      fg: URGENCY_HEX.red.icon,
      bg: URGENCY_HEX.white,
      min: WCAG_AA_UI,
    },
    {
      id: "amber-icon-on-white",
      fg: URGENCY_HEX.amber.icon,
      bg: URGENCY_HEX.white,
      min: WCAG_AA_UI,
    },
    {
      id: "green-icon-on-white",
      fg: URGENCY_HEX.green.icon,
      bg: URGENCY_HEX.white,
      min: WCAG_AA_UI,
    },
  ];

  return pairs.map((p) => {
    const ratio = contrastRatio(p.fg, p.bg);
    return {
      id: p.id,
      fg: p.fg,
      bg: p.bg,
      ratio,
      min: p.min,
      pass: ratio + 1e-9 >= p.min,
    };
  });
}

export function assertUrgencyContrastAa(): void {
  const failed = checkUrgencyContrast().filter((c) => !c.pass);
  if (failed.length) {
    const detail = failed
      .map((f) => `${f.id}: ${f.ratio.toFixed(2)} < ${f.min}`)
      .join("; ");
    throw new Error(`WCAG contrast failures: ${detail}`);
  }
}
