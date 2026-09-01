"use client";

import { EmailsWorkspace } from "@/components/activities/emails/EmailsWorkspace";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { BOARD_PAGE } from "@/lib/layout";

export default function EmailsPage() {
  return (
    <div className={`${BOARD_PAGE} h-full`}>
      <FocusHighlight />
      <EmailsWorkspace />
    </div>
  );
}
