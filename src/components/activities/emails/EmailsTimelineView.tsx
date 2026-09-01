"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import type { Email } from "@/lib/emails/types";

export function EmailsTimelineView({ emails }: { emails: Email[] }) {
  const rows = useMemo(
    () =>
      emails.map((email) => ({
        id: email.id,
        title: email.subject,
        meta: `${email.status} · ${email.from} · ${email.to.join(", ")}${
          email.sentDate ? ` · ${email.sentDate}` : ""
        }`,
        at: email.sentDate ? parseTaskDueDate(email.sentDate) : null,
      })),
    [emails],
  );

  return (
    <ActivityTimelineView
      title="Email timeline"
      hint="Sorted by sent time"
      rows={rows}
      emptyLabel="No emails match the current filters"
    />
  );
}
