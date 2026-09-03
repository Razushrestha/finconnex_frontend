"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { listMessages } from "@/lib/messages/store";
import type { Message } from "@/lib/messages/types";

export function MessagesTimelineView({ data }: { data?: Message[] }) {
  const rows = useMemo(
    () =>
      (data ?? listMessages()).map((message) => ({
        id: message.id,
        title: message.subject,
        meta: `${message.status} · ${message.type} · ${message.from} → ${message.to}${
          message.sentDate ? ` · ${message.sentDate}` : ""
        }`,
        at: message.sentDate ? parseTaskDueDate(message.sentDate) : null,
      })),
    [data],
  );

  return (
    <ActivityTimelineView
      title="Message timeline"
      hint="Sorted by sent time"
      rows={rows}
      emptyLabel="No messages to show"
    />
  );
}
