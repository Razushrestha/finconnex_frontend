"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computeDashboardStats,
  type DashboardFilters,
  type DashboardLiveStats,
} from "@/lib/dashboard/layout";
import {
  industryTiles,
  loadIndustryPreset,
  type DashboardIndustryTile,
} from "@/lib/dashboard/industry";
import {
  chartsFromStats,
  type DashboardChartData,
} from "@/lib/dashboard/charts";
import {
  fetchLiveDashboardSnapshot,
  type DashboardDataSource,
} from "@/lib/dashboard/fetch-live-stats";

export function useCrmDashboardStats(filters: DashboardFilters) {
  const [stats, setStats] = useState<DashboardLiveStats>(() =>
    computeDashboardStats(filters),
  );
  const [industry, setIndustry] = useState<DashboardIndustryTile[]>(() =>
    industryTiles(loadIndustryPreset(), computeDashboardStats(filters)),
  );
  const [charts, setCharts] = useState<DashboardChartData>(() =>
    chartsFromStats(computeDashboardStats(filters)),
  );
  const [source, setSource] = useState<DashboardDataSource>("demo");
  const [owners, setOwners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStats(computeDashboardStats(filters));
    setIndustry(
      industryTiles(loadIndustryPreset(), computeDashboardStats(filters)),
    );
    setCharts(chartsFromStats(computeDashboardStats(filters)));

    void (async () => {
      const snap = await fetchLiveDashboardSnapshot(filters);
      if (cancelled) return;
      setStats(snap.stats);
      setIndustry(snap.industryTiles);
      setCharts(snap.charts);
      setSource(snap.source);
      if (snap.owners.length) setOwners(snap.owners);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, tick]);

  return { stats, industry, charts, source, owners, loading, refresh };
}
