"use client";

import Link from "next/link";
import { hrefForRelatedTo } from "@/lib/activities/related-href";
import { formatRelatedTo, type RelatedTo } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

interface RelatedToLinkProps {
  relatedTo?: string | RelatedTo;
  className?: string;
}

export function RelatedToLink({ relatedTo, className }: RelatedToLinkProps) {
  const label = formatRelatedTo(relatedTo).trim() || "Unrelated";
  const href = hrefForRelatedTo(label);

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
