"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  hrefForRelatedKindId,
  hrefForRelatedTo,
  parseRelatedTo,
} from "@/lib/activities/related-href";
import { fetchCrmRelatedRecords } from "@/lib/activities/related-records";
import { cn } from "@/lib/utils";

export function SignatureRelatedToLink({
  relatedTo,
  className,
}: {
  relatedTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const label = relatedTo?.trim() || "—";
  const href = hrefForRelatedTo(relatedTo);

  if (!href) {
    return <span className={cn("block truncate", className)}>{label}</span>;
  }

  const opensRecord = href.includes("/detail/");

  return (
    <Link
      href={href}
      onClick={(event) => {
        event.stopPropagation();
        if (opensRecord) return;
        const parsed = parseRelatedTo(relatedTo);
        if (!parsed) return;
        event.preventDefault();
        void (async () => {
          try {
            const rows = await fetchCrmRelatedRecords(parsed.kind);
            const want = parsed.name.trim().toLowerCase();
            const hit = rows.find(
              (row) => row.name.trim().toLowerCase() === want && row.id,
            );
            router.push(
              hit?.id ? hrefForRelatedKindId(parsed.kind, hit.id) : href,
            );
          } catch {
            router.push(href);
          }
        })();
      }}
      className={cn(
        "block truncate cursor-pointer font-medium text-slate-900 hover:text-violet-700 hover:underline dark:text-white",
        className,
      )}
    >
      {label}
    </Link>
  );
}
