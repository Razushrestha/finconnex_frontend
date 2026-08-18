"use client";

import { Mail, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { initials, avatarColor } from "@/lib/activities/shared";
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
  const name = contactName || "Unknown contact";
  const profileHref = hrefForRelatedTo(relatedTo);

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm">
      <div
        className={cn(
          "mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold shadow-inner",
          avatarColor(name),
        )}
      >
        {initials(name)}
      </div>
      <h3 className="text-sm font-bold text-slate-900">{name}</h3>
      <p className="mb-4 text-[11px] text-slate-500">
        {relatedTo?.startsWith("Lead") ? "Lead" : "Client / contact"}
      </p>

      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/activities/emails/create?to=${encodeURIComponent(name)}`,
            )
          }
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F3ECFB] py-2 text-xs font-semibold text-[#5A32A3] hover:bg-[#EDE0F8]"
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
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F3ECFB] py-2 text-xs font-semibold text-[#5A32A3] hover:bg-[#EDE0F8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserIcon className="h-3.5 w-3.5" />
          Profile
        </button>
      </div>
    </div>
  );
}
