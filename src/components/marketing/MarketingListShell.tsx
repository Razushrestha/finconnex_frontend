import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Full-bleed list shell matching Sales/Activities pages —
 * fills the dashboard pane with no max-width gutter gaps.
 */
export function MarketingListShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-h-full w-full flex-1 flex-col overflow-hidden bg-slate-50 p-2 pr-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
