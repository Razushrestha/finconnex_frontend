import { cn } from "@/lib/utils";
import { ArrowTag } from "@/components/common/ArrowTag";
import { brightFillClass, brightHexFromClass } from "@/lib/ui/status-pill";

export function StatusColorPill({
  label,
  solidClass,
  toneClassName,
  className,
}: {
  label: string;
  /** Kanban/dot class such as `bg-violet-500`. */
  solidClass?: string;
  /** Pastel or solid classes; converted to a bright fill. */
  toneClassName?: string;
  className?: string;
}) {
  return (
    <ArrowTag
      compact
      color={brightHexFromClass(solidClass, toneClassName)}
      className={cn(brightFillClass(solidClass, toneClassName), className)}
    >
      {label}
    </ArrowTag>
  );
}
