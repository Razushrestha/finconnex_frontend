"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAnalyticsWidgets,
  overlayAnalyticsSnapshot,
} from "@/lib/analytics/crm";
import {
  getAnalyticsSnapshot,
  type AnalyticsPeriod,
  type AnalyticsSnapshot,
  type AnalyticsTeam,
} from "@/lib/analytics/types";

export type AnalyticsDataSource = "api" | "demo" | "mixed";

export function useCrmAnalytics(opts: {
  period: AnalyticsPeriod;
  team: AnalyticsTeam;
  owner: string;
  compare: boolean;
}) {
  const mock = useMemo(
    () =>
      getAnalyticsSnapshot({
        period: opts.period,
        team: opts.team,
        owner: opts.owner,
      }),
    [opts.period, opts.team, opts.owner],
  );

  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(mock);
  const [source, setSource] = useState<AnalyticsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(mock);
    setSource("demo");
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const widgets = await fetchAnalyticsWidgets({
          period: opts.period,
          compare: opts.compare,
        });
        if (cancelled) return;
        if (widgets.size === 0) {
          setSnapshot(mock);
          setSource("demo");
          return;
        }
        setSnapshot(overlayAnalyticsSnapshot(mock, widgets));
        setSource(widgets.size >= 8 ? "api" : "mixed");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Analytics unavailable");
        setSnapshot(mock);
        setSource("demo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mock, opts.period, opts.compare]);

  return { snapshot, source, loading, error };
}
