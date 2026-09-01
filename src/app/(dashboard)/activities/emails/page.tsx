"use client";

import { EmailsWorkspace } from "@/components/activities/emails/EmailsWorkspace";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { BOARD_PAGE } from "@/lib/layout";
import { useCrmEmails } from "@/lib/emails/use-crm-emails";
import { cn } from "@/lib/utils";

export default function EmailsPage() {
  const crm = useCrmEmails();

  return (
    <div className={`${BOARD_PAGE} h-full`}>
      <FocusHighlight />
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crm.source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crm.source === "api"
            ? "Live CRM"
            : crm.loading
              ? "Connecting…"
              : "Demo"}
        </span>
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
      <EmailsWorkspace />
    </div>
  );
}
