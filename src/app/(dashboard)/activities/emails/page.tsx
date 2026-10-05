"use client";

import { EmailsWorkspace } from "@/components/activities/emails/EmailsWorkspace";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { BOARD_PAGE } from "@/lib/layout";
import { useCrmEmails } from "@/lib/emails/use-crm-emails";

export default function EmailsPage() {
  const crm = useCrmEmails();

  return (
    <div className={`${BOARD_PAGE} h-full`}>
      <FocusHighlight />
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
      <EmailsWorkspace
        onSync={crm.refresh}
        storeRevision={crm.version}
      />
    </div>
  );
}
