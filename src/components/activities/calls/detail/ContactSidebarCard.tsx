"use client";

import { ExternalLink, Mail, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { hrefForRelatedTo } from "@/lib/activities/related-href";

interface ContactSidebarProps {
  contactName?: string;
  relatedTo?: string;
}

export function ContactSidebarCard({
  contactName,
  relatedTo,
}: ContactSidebarProps) {
  const router = useRouter();
  const name = contactName || relatedTo || "—";
  const profileHref = hrefForRelatedTo(relatedTo);
  const kind = relatedTo?.startsWith("Lead")
    ? "Lead"
    : relatedTo?.startsWith("Contact")
      ? "Contact"
      : relatedTo?.split(":")[0] || "Contact";

  return (
    <section className="border-b border-slate-100 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Context
        </h2>
      </div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{name}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{kind}</p>
        </div>
        {profileHref ? (
          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="text-slate-400 hover:text-[#5A32A3]"
            aria-label="Open related record"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {relatedTo ? (
        <p className="mb-4 text-xs text-slate-500">
          <RelatedToLink
            relatedTo={relatedTo}
            className="font-medium text-slate-700"
          />
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/activities/emails/create?to=${encodeURIComponent(name)}`,
            )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A32A3] hover:underline"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </button>
        <button
          type="button"
          onClick={() => {
            if (profileHref) router.push(profileHref);
          }}
          disabled={!profileHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A32A3] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          <UserIcon className="h-3.5 w-3.5" />
          Profile
        </button>
      </div>
    </section>
  );
}
