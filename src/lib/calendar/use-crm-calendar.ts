"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCalendarViewBundle,
  isoDateLocal,
  type CalendarDataSource,
  type CalendarViewKind,
} from "@/lib/calendar/api";
import type { CalendarItem } from "@/lib/calendar/types";

export function useCrmCalendar(opts: {
  view: CalendarViewKind;
  anchor: Date;
}) {
  const anchorKey = isoDateLocal(opts.anchor);
  const [remoteItems, setRemoteItems] = useState<CalendarItem[]>([]);
  const [conflicts, setConflicts] = useState<CalendarItem[]>([]);
  const [source, setSource] = useState<CalendarDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const bundle = await fetchCalendarViewBundle(opts.view, opts.anchor);
        if (cancelled) return;
        setRemoteItems(bundle.items);
        setConflicts(bundle.conflicts);
        setSource(bundle.items.length > 0 ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setRemoteItems([]);
        setConflicts([]);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Calendar unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh via tick; anchor via date key
  }, [opts.view, anchorKey, tick]);

  return {
    remoteItems,
    conflicts,
    source,
    loading,
    error,
    refresh,
  };
}
