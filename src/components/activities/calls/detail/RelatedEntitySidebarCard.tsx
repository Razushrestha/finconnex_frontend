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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
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
          className="flex items-center gap-3 rounded-xl border border-[#5A32A3]/15 bg-[#F3ECFB]/40 p-3.5 transition-colors hover:border-[#5A32A3]/35 hover:bg-[#F3ECFB]"
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
