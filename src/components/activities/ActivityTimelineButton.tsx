"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON_CLASS =
  "inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700";

export function ActivityTimelineButton({
  href,
  onClick,
  active = false,
  className,
}: {
  href?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const classes = cn(
    BUTTON_CLASS,
    active && "border-violet-300 bg-violet-50 text-violet-700",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        <History className="h-3.5 w-3.5" />
        Timeline
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      <History className="h-3.5 w-3.5" />
      Timeline
    </button>
  );
}
