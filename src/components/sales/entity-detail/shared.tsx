import type { BadgeTone } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/80",
  danger: "bg-rose-50 text-rose-700 ring-rose-200/80",
  info: "bg-sky-50 text-sky-700 ring-sky-200/80",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200/80",
};

const TONE_DOT: Record<BadgeTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
};

export function toneClasses(tone: BadgeTone) {
  return TONE_CLASSES[tone];
}

export function toneDotClass(tone: BadgeTone) {
  return TONE_DOT[tone];
}

/** Shared card shell — flat professional surface, consistent radius/border. */
export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        {children}
      </h3>
      {action}
    </div>
  );
}
