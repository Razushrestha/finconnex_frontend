import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrailLink = {
  label: string;
  href?: string;
  current?: boolean;
};

/** Thin Estimate → Quote → Invoice → Payment trail (no journey chrome). */
export function CommercialTrail({
  links,
  className,
}: {
  links: TrailLink[];
  className?: string;
}) {
  const visible = links.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-2.5 flex flex-wrap items-center gap-1 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] shadow-sm",
        className,
      )}
    >
      <span className="mr-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Linked
      </span>
      {visible.map((link, i) => (
        <span key={`${link.label}-${i}`} className="flex items-center gap-1">
          {i > 0 ? (
            <ChevronRight className="h-3 w-3 text-slate-300" />
          ) : null}
          {link.href && !link.current ? (
            <Link
              href={link.href}
              className="font-semibold text-violet-600 hover:underline"
            >
              {link.label}
            </Link>
          ) : (
            <span
              className={cn(
                "font-semibold",
                link.current ? "text-slate-900" : "text-slate-500",
              )}
            >
              {link.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
