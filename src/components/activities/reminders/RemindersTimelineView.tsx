"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import type { Reminder } from "@/lib/reminders/types";

export function RemindersTimelineView({
  reminders,
}: {
  reminders: Reminder[];
}) {
  const rows = useMemo(
    () =>
      reminders.map((reminder) => {
        const at = parseTaskDueDate(reminder.dateTime);
        const overdue =
          reminder.status === "Pending" &&
          !!at &&
          at.getTime() < Date.now();
        return {
          id: reminder.id,
          title: reminder.title,
          meta: `${reminder.status} · ${reminder.type} · ${reminder.owner} · ${reminder.dateTime}`,
          at,
          overdue,
        };
      }),
    [reminders],
  );

  return (
    <ActivityTimelineView
      title="Reminder timeline"
      hint="Sorted by reminder time"
      rows={rows}
      emptyLabel="No reminders match the current filters"
    />
  );
}
