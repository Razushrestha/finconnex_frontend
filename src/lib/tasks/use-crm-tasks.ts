"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmTasks,
  listCrmTasksToday,
  listMyCrmTasks,
  listOverdueCrmTasks,
  listUpcomingCrmTasks,
  tryCrmTask,
} from "@/lib/tasks/api";
import { replaceCrmTasks } from "@/lib/tasks/store";
import type { Task } from "@/lib/tasks/types";

export type TasksDataSource = "api" | "demo";

function mergeTasks(...groups: Array<Task[] | null>) {
  const byId = new Map<string, Task>();
  for (const group of groups) {
    for (const row of group ?? []) byId.set(row.taskId, row);
  }
  return [...byId.values()];
}

export function useCrmTasks() {
  const [source, setSource] = useState<TasksDataSource>("demo");
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
        const [all, today, upcoming, overdue, mine] = await Promise.all([
          listCrmTasks(),
          tryCrmTask(() => listCrmTasksToday()),
          tryCrmTask(() => listUpcomingCrmTasks()),
          tryCrmTask(() => listOverdueCrmTasks()),
          tryCrmTask(() => listMyCrmTasks()),
        ]);
        if (cancelled) return;
        replaceCrmTasks(mergeTasks(all, today, upcoming, overdue, mine));
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Tasks unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, refresh };
}
