import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  /** Tailwind bg/text classes for this specific status, e.g. "bg-amber-50 text-amber-800" */
  colorClassName: string;
}

/** Compact status pill used in marketing tables. */
export function StatusBadge({ label, colorClassName }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
        colorClassName,
      )}
    >
      {label}
    </span>
  );
}
