"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmMyReminders,
  listCrmOverdueReminders,
  listCrmReminders,
  listCrmUpcomingReminders,
} from "@/lib/reminders/api";
import { replaceCrmReminders } from "@/lib/reminders/store";

export type RemindersDataSource = "api" | "demo";
export type ReminderListScope = "all" | "my" | "upcoming" | "overdue";

export function useCrmReminders(scope: ReminderListScope = "all") {
  const [source, setSource] = useState<RemindersDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote =
          scope === "my"
            ? await listCrmMyReminders()
            : scope === "upcoming"
              ? await listCrmUpcomingReminders()
              : scope === "overdue"
                ? await listCrmOverdueReminders()
                : await listCrmReminders();
        if (cancelled) return;
        replaceCrmReminders(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Reminders unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, scope]);

  return { source, loading, error, refresh };
}
