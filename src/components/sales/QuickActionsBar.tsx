"use client";

import { cn } from "@/lib/utils";

export interface QuickActionItem<TKind extends string = string> {
  kind: TKind;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Only rendered when >= 2 — matches the existing "don't badge a single pending item" convention. */
  badgeCount?: number;
  /** Full aria-label override, e.g. to fold in urgency/count context. Falls back to `label`. */
  ariaLabel?: string;
  /** Hover tooltip text. Falls back to `label`. */
  title?: string;
  /** Per-action color classes (e.g. urgency-driven state). Falls back to the bar's `hoverClassName`. */
  colorClassName?: string;
  /** Badge pill color classes. Falls back to a neutral dark pill. */
  badgeClassName?: string;
}

interface QuickActionsBarProps<TKind extends string> {
  actions: QuickActionItem<TKind>[];
  onAction?: (kind: TKind) => void;
  /** Toolbar aria-label, e.g. `Quick actions for ${name}`. */
  ariaLabel?: string;
  /** Applied to any action that doesn't specify its own `colorClassName`. */
  hoverClassName?: string;
  /** "md" matches Lead's card (7×7 buttons); "sm" matches a denser card (6×6 buttons, e.g. Contact). */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: { button: "h-6 w-6", icon: "h-3 w-3" },
  md: { button: "h-7 w-7", icon: "h-3.5 w-3.5" },
} as const;

/**
 * Row of icon-only quick-action buttons for a draggable card. Stops
 * pointer/click propagation on every button so it never triggers the
 * card's own drag gesture, and just calls `onAction(kind)` — the parent
 * board decides what each action actually does (open a panel, log an
 * activity, etc.), this component only renders and dispatches.
 */
export function QuickActionsBar<TKind extends string>({
  actions,
  onAction,
  ariaLabel,
  hoverClassName = "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
  size = "md",
  className,
}: QuickActionsBarProps<TKind>) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cn("flex items-center justify-between gap-0.5", className)}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const badge =
          action.badgeCount && action.badgeCount >= 2
            ? String(action.badgeCount)
            : null;

        return (
          <button
            key={action.kind}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(action.kind);
            }}
            aria-label={action.ariaLabel ?? action.label}
            title={action.title ?? action.label}
            className={cn(
              "relative flex items-center justify-center rounded-md transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
              sizeClasses.button,
              action.colorClassName ?? hoverClassName,
            )}
          >
            <Icon className={sizeClasses.icon} aria-hidden />
            {badge && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none",
                  action.badgeClassName ?? "bg-slate-700 text-white",
                )}
                aria-hidden
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
