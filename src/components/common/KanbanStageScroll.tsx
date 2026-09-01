import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KANBAN_STAGE_SCROLL } from "@/lib/layout";

/** Scrolls a kanban stage with the bar outside the well, top to bottom. */
export function KanbanStageScroll({
  children,
  footer,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className={cn(KANBAN_STAGE_SCROLL, className)} {...props}>
        {children}
      </div>
      {footer}
    </div>
  );
}
