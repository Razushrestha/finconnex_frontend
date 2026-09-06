"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { listMessages } from "@/lib/messages/store";
import { onRulesChange } from "@/lib/rules";
import type { Message } from "@/lib/messages/types";

export function MessagesTimelineView({ data }: { data?: Message[] }) {
  const [items, setItems] = useState(() => data ?? listMessages());
  useEffect(() => {
    if (data) {
      setItems(data);
      return;
    }
    return onRulesChange(() => setItems(listMessages()));
  }, [data]);
  const rows = useMemo(
    () =>
      items.map((message) => ({
        id: message.id,
        title: message.subject,
        meta: `${message.status} · ${message.type} · ${message.from} → ${message.to}${
          message.sentDate ? ` · ${message.sentDate}` : ""
        }`,
        at: message.sentDate ? parseTaskDueDate(message.sentDate) : null,
      })),
    [items],
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
