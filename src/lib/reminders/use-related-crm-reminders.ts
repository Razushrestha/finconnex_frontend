"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRelatedCrmReminder,
  dismissCrmReminder,
  listRelatedCrmReminders,
  toCreateReminderBody,
  tryCrmReminder,
} from "@/lib/reminders/api";
import {
  canUseRelatedReminders,
  reminderDueAt,
  reminderToTaskReminder,
  type ReminderParentType,
} from "@/lib/reminders/related";
import type { TaskReminder } from "@/lib/tasks/types";

export type RelatedRemindersSource = "idle" | "api" | "error";

export function useRelatedCrmReminders(
  parentType: ReminderParentType,
  parentId: string,
) {
  const [items, setItems] = useState<TaskReminder[]>([]);
  const [source, setSource] = useState<RelatedRemindersSource>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = canUseRelatedReminders(parentId);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!live) {
      setItems([]);
      setSource("idle");
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const remote = await listRelatedCrmReminders(parentType, parentId);
        if (cancelled) return;
        setItems(remote.map(reminderToTaskReminder));
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("error");
        setError(err instanceof Error ? err.message : "Reminders unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, parentType, parentId, tick]);

  async function create(reminder: TaskReminder): Promise<TaskReminder> {
    if (!live) return reminder;
    const created = await createRelatedCrmReminder(
      parentType,
      parentId,
      toCreateReminderBody({
        title: reminder.type,
        dueAt: reminderDueAt(reminder),
        type: reminder.type,
        notificationMethod: reminder.notificationMethod,
        relatedType: parentType,
        relatedId: parentId,
      }),
    );
    const next = created ? reminderToTaskReminder(created) : reminder;
    setItems((prev) => [...prev, next]);
    return next;
  }

  async function remove(id: string) {
    if (live) await tryCrmReminder(() => dismissCrmReminder(id));
    setItems((prev) => prev.filter((row) => row.id !== id));
  }

  return { items, source, loading, error, live, refresh, create, remove };
}
