"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isActivityNav, type WorkQueueNavId } from "@/lib/work-queue/config";
import {
  countQueueRowsByNav,
  filterQueueRowsByNav,
  listCrmWorkQueueForNav,
  tryCrmWorkQueue,
} from "@/lib/work-queue/api";
import {
  countRecordNavs,
  fetchLiveRecordQueues,
  rowsForRecordNav,
  type LiveRecordQueues,
} from "@/lib/work-queue/record-queues";
import type {
  QueueRow,
  WorkQueueTimeFilter,
} from "@/lib/work-queue/live";

export type WorkQueueDataSource = "api" | "demo";

const EMPTY_RECORDS: LiveRecordQueues = {
  leads: [],
  contacts: [],
  deals: [],
};

export function useCrmWorkQueue(opts: {
  nav: WorkQueueNavId;
  scope: string;
  timeFilter: WorkQueueTimeFilter;
  specificDate?: Date | null;
  filters?: { priority?: string; status?: string };
  nameById?: Record<string, string>;
  selfId?: string;
  tick?: number;
}) {
  const [source, setSource] = useState<WorkQueueDataSource>("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<QueueRow[]>([]);
  const [records, setRecords] = useState<LiveRecordQueues>(EMPTY_RECORDS);
  const [localTick, setLocalTick] = useState(0);

  const refresh = useCallback(() => setLocalTick((n) => n + 1), []);
  const specificKey = opts.specificDate?.toISOString() ?? "";
  const namesKey = JSON.stringify(opts.nameById ?? {});
  const activity = isActivityNav(opts.nav);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const page = await tryCrmWorkQueue(() =>
        listCrmWorkQueueForNav("queue", {
          scope: opts.scope,
          timeFilter: opts.timeFilter,
          specificDate: opts.specificDate ?? undefined,
          nameById: opts.nameById,
          selfId: opts.selfId,
        }),
      );
      const liveRecords = await fetchLiveRecordQueues({
        scope: opts.scope,
        nameById: opts.nameById,
      }).catch(() => EMPTY_RECORDS);
      if (cancelled) return;
      if (page) {
        setAllRows(page.all ?? page.items);
        setRecords(liveRecords);
        setSource("api");
      } else {
        setAllRows([]);
        setRecords(EMPTY_RECORDS);
        setSource("demo");
        setError("Work queue unavailable");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    opts.scope,
    opts.timeFilter,
    opts.tick,
    localTick,
    specificKey,
    namesKey,
    opts.specificDate,
    opts.nameById,
    opts.selfId,
  ]);

  const rows = useMemo(() => {
    if (activity) return filterQueueRowsByNav(allRows, opts.nav);
    return rowsForRecordNav(opts.nav, records, allRows) ?? [];
  }, [activity, allRows, opts.nav, records]);

  const counts = useMemo(
    () => ({
      ...countQueueRowsByNav(allRows),
      ...countRecordNavs(records, allRows),
    }),
    [allRows, records],
  );

  return {
    source,
    loading,
    error,
    rows,
    allRows,
    counts,
    total: rows.length,
    refresh,
  };
}
