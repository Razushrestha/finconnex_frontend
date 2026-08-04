import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  /** Tailwind bg/text classes for this specific status, e.g. "bg-amber-50 text-amber-800" */
  colorClassName: string;
}

/** Small rounded status pill used in table rows across every campaign type. */
export function StatusBadge({ label, colorClassName }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[12px] font-semibold",
        colorClassName,
      )}
    >
      {label}
    </span>
  );
}
