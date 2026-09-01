"use client";

import { useCallback, useEffect, useState } from "react";
import { isActivityNav, type ActivityNavId, type WorkQueueNavId } from "@/lib/work-queue/config";
import {
  listCrmWorkQueueForNav,
  tryCrmWorkQueue,
} from "@/lib/work-queue/api";
import type {
  QueueRow,
  WorkQueueTimeFilter,
} from "@/lib/work-queue/live";

export type WorkQueueDataSource = "api" | "demo";

export function useCrmWorkQueue(opts: {
  nav: WorkQueueNavId;
  scope: string;
  timeFilter: WorkQueueTimeFilter;
  specificDate?: Date | null;
  filters?: { priority?: string; status?: string };
  nameById?: Record<string, string>;
  tick?: number;
}) {
  const [source, setSource] = useState<WorkQueueDataSource>("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [localTick, setLocalTick] = useState(0);

  const refresh = useCallback(() => setLocalTick((n) => n + 1), []);
  const priority = opts.filters?.priority ?? "all";
  const status = opts.filters?.status ?? "all";
  const specificKey = opts.specificDate?.toISOString() ?? "";
  const namesKey = JSON.stringify(opts.nameById ?? {});

  useEffect(() => {
    if (!isActivityNav(opts.nav)) {
      setSource("demo");
      setRows([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const page = await tryCrmWorkQueue(() =>
        listCrmWorkQueueForNav(opts.nav as ActivityNavId, {
          scope: opts.scope,
          timeFilter: opts.timeFilter,
          specificDate: opts.specificDate ?? undefined,
          status,
          priority,
          nameById: opts.nameById,
        }),
      );
      if (cancelled) return;
      if (page && page.items.length) {
        setRows(page.items);
        setTotal(page.total);
        setSource("api");
      } else if (page) {
        setRows([]);
        setTotal(0);
        setSource("api");
      } else {
        setRows([]);
        setTotal(0);
        setSource("demo");
        setError("Work queue unavailable");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    opts.nav,
    opts.scope,
    opts.timeFilter,
    opts.tick,
    localTick,
    priority,
    status,
    specificKey,
    namesKey,
    opts.specificDate,
    opts.nameById,
  ]);

  return { source, loading, error, rows, total, refresh };
}
