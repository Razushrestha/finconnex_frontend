"use client";

import { Mail, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface ContactSidebarProps {
  contactName?: string;
}

export function ContactSidebarCard({ contactName }: ContactSidebarProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-white p-6 shadow-sm text-center">
      <div className="mb-3 h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted shadow-inner flex items-center justify-center">
        <UserIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground">
        {contactName || "Unknown Contact"}
      </h3>
      <p className="mb-4 text-[11px] text-muted-foreground">Client / Lead</p>

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          onClick={() => router.push("/activities/emails/create")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90 transition-opacity"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90 transition-opacity"
        >
          <UserIcon className="h-3.5 w-3.5" />
          Profile
        </button>
      </div>
    </div>
  );
}
