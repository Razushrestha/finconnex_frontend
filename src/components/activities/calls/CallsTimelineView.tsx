"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import {
  callMatchesScope,
  isCallOverdue,
  listCalls,
  parseCallWhen,
  type CallScope,
} from "@/lib/calls/store";

export function CallsTimelineView({ scope = "all" }: { scope?: CallScope }) {
  const rows = useMemo(
    () =>
      listCalls()
        .filter((call) => callMatchesScope(call, scope))
        .map((call) => ({
          id: call.id,
          title: call.subject,
          meta: `${call.status} · ${call.callType} · ${call.assignedTo} · ${call.date}`,
          at: parseCallWhen(call.date),
          overdue: isCallOverdue(call),
        })),
    [scope],
  );

  return (
    <ActivityTimelineView
      title="Call timeline"
      hint="Sorted by call time"
      rows={rows}
      emptyLabel="No calls match the current filters"
    />
  );
}
