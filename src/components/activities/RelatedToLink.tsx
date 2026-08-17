"use client";

import Link from "next/link";
import { hrefForRelatedTo } from "@/lib/activities/related-href";
import { cn } from "@/lib/utils";

interface RelatedToLinkProps {
  relatedTo?: string;
  className?: string;
}

export function RelatedToLink({ relatedTo, className }: RelatedToLinkProps) {
  const label = relatedTo?.trim() || "Unrelated";
  const href = hrefForRelatedTo(relatedTo);

  if (!href) {
    return <span className={cn("truncate", className)}>{label}</span>;
  }

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "truncate hover:text-violet-700 hover:underline",
        className,
      )}
    >
      {label}
    </Link>
  );
}
