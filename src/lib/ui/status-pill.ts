/** Solid kanban dots → pastel list-view pills (light fill, dark text). */
const PILL_BY_SOLID: Record<string, string> = {
  "bg-sky-400": "bg-sky-100 text-sky-800",
  "bg-sky-500": "bg-sky-100 text-sky-800",
  "bg-cyan-500": "bg-cyan-100 text-cyan-800",
  "bg-teal-500": "bg-teal-100 text-teal-800",
  "bg-blue-500": "bg-blue-100 text-blue-800",
  "bg-blue-600": "bg-blue-100 text-blue-800",
  "bg-indigo-500": "bg-indigo-100 text-indigo-800",
  "bg-violet-500": "bg-violet-100 text-violet-800",
  "bg-purple-500": "bg-purple-100 text-purple-800",
  "bg-fuchsia-500": "bg-fuchsia-100 text-fuchsia-800",
  "bg-pink-500": "bg-pink-100 text-pink-800",
  "bg-rose-400": "bg-rose-100 text-rose-800",
  "bg-rose-500": "bg-rose-100 text-rose-800",
  "bg-orange-400": "bg-orange-100 text-orange-800",
  "bg-orange-500": "bg-orange-100 text-orange-800",
  "bg-amber-400": "bg-amber-100 text-amber-900",
  "bg-amber-500": "bg-amber-100 text-amber-900",
  "bg-yellow-500": "bg-amber-100 text-amber-900",
  "bg-green-500": "bg-green-100 text-green-800",
  "bg-emerald-400": "bg-emerald-100 text-emerald-800",
  "bg-emerald-500": "bg-emerald-100 text-emerald-800",
  "bg-slate-400": "bg-slate-100 text-slate-700",
  "bg-slate-500": "bg-slate-100 text-slate-700",
  "bg-zinc-400": "bg-zinc-100 text-zinc-700",
};

export function pillToneFromSolid(solidClass?: string) {
  if (!solidClass) return "bg-slate-100 text-slate-700";
  const key =
    solidClass
      .split(/\s+/)
      .find((part) => part.startsWith("bg-") && !part.includes("/")) ??
    solidClass;
  return PILL_BY_SOLID[key] ?? "bg-slate-100 text-slate-700";
}

/** Bright solid fill for arrow tags (white text). */
export function brightFillClass(solidClass?: string, toneClassName?: string) {
  const fromSolid = solidClass
    ?.split(/\s+/)
    .find((part) => part.startsWith("bg-") && !part.includes("/"));
  if (fromSolid) return fromSolid;
  const fromTone = toneClassName
    ?.split(/\s+/)
    .find((part) => part.startsWith("bg-"));
  if (fromTone) {
    return fromTone
      .replace("-50", "-500")
      .replace("-100", "-500")
      .replace("-200", "-500");
  }
  return "bg-slate-500";
}

const BRIGHT_HEX: Record<string, string> = {
  "bg-red-500": "#EF4444",
  "bg-rose-400": "#FB7185",
  "bg-rose-500": "#F43F5E",
  "bg-orange-400": "#FB923C",
  "bg-orange-500": "#F97316",
  "bg-amber-400": "#FBBF24",
  "bg-amber-500": "#F59E0B",
  "bg-yellow-500": "#EAB308",
  "bg-green-500": "#22C55E",
  "bg-emerald-400": "#34D399",
  "bg-emerald-500": "#22C55E",
  "bg-teal-500": "#14B8A6",
  "bg-cyan-500": "#06B6D4",
  "bg-sky-400": "#38BDF8",
  "bg-sky-500": "#0EA5E9",
  "bg-blue-500": "#3B82F6",
  "bg-blue-600": "#2563EB",
  "bg-indigo-500": "#6366F1",
  "bg-violet-500": "#7C3AED",
  "bg-purple-500": "#7C3AED",
  "bg-fuchsia-500": "#DB2777",
  "bg-pink-500": "#EC4899",
  "bg-slate-400": "#94A3B8",
  "bg-slate-500": "#64748B",
  "bg-zinc-400": "#A1A1AA",
};

export function brightHexFromClass(solidClass?: string, toneClassName?: string) {
  return BRIGHT_HEX[brightFillClass(solidClass, toneClassName)] ?? "#64748B";
}

export const STATUS_PILL_CLASS =
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap";
