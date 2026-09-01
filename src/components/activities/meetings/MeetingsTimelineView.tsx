"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { isMeetingOverdue } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";

export function MeetingsTimelineView({ meetings }: { meetings: Meeting[] }) {
  const rows = useMemo(
    () =>
      meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        meta: `${meeting.status} · ${meeting.type} · ${meeting.organizer} · ${meeting.startDateTime}`,
        at: parseTaskDueDate(meeting.startDateTime),
        overdue: isMeetingOverdue(meeting),
      })),
    [meetings],
  );

  return (
    <ActivityTimelineView
      title="Meeting timeline"
      hint="Sorted by start time"
      rows={rows}
      emptyLabel="No meetings match the current filters"
    />
  );
}
