"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { hrefForRelatedTo } from "@/lib/activities/related-href";

interface RelatedEntityProps {
  relatedTo?: string;
}

export function RelatedEntitySidebarCard({ relatedTo }: RelatedEntityProps) {
  if (!relatedTo) return null;

  const href = hrefForRelatedTo(relatedTo);

  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="truncate text-xs font-bold text-foreground">
          {relatedTo}
        </h5>
      </div>
    </>
  );

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h4 className="mb-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        Related Item
      </h4>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-3 rounded-xl border border-[var(--brand-primary)]/15 bg-[var(--brand-primary-soft)]/40 p-3.5 transition-colors hover:border-[var(--brand-primary)]/35 hover:bg-[var(--brand-primary-soft)]"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-accent/50 p-3.5">
          {inner}
        </div>
      )}
    </div>
  );
}
