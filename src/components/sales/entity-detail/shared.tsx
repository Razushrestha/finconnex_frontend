import type { BadgeTone } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const TONE_DOT: Record<BadgeTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  neutral: "bg-muted-foreground",
};

export function toneClasses(tone: BadgeTone) {
  return TONE_CLASSES[tone];
}

export function toneDotClass(tone: BadgeTone) {
  return TONE_DOT[tone];
}

/** Shared card shell so every panel on the page has the same border/radius/shadow. */
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
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
