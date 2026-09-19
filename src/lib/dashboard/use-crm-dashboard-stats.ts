"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computeDashboardStats,
  emptyDashboardLiveStats,
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
  computeExecutiveOverview,
  emptyExecutiveOverview,
  type ExecutiveOverview,
} from "@/lib/dashboard/executive";
import {
  computePerformanceDashboard,
  type PerformanceDashboard,
} from "@/lib/dashboard/performance";
import {
  computeSalesDashboard,
  type SalesDashboard,
} from "@/lib/dashboard/sales";
import {
  fetchLiveDashboardSnapshot,
  type DashboardDataSource,
} from "@/lib/dashboard/fetch-live-stats";

export function useCrmDashboardStats(filters: DashboardFilters) {
  const [stats, setStats] = useState<DashboardLiveStats>(() =>
    emptyDashboardLiveStats(),
  );
  const [industry, setIndustry] = useState<DashboardIndustryTile[]>([]);
  const [charts, setCharts] = useState<DashboardChartData>(() =>
    chartsFromStats(emptyDashboardLiveStats()),
  );
  const [executive, setExecutive] = useState<ExecutiveOverview>(() =>
    emptyExecutiveOverview(),
  );
  const [sales, setSales] = useState<SalesDashboard>(() =>
    computeSalesDashboard(filters),
  );
  const [performance, setPerformance] = useState<PerformanceDashboard>(() =>
    computePerformanceDashboard(filters),
  );
  const [source, setSource] = useState<DashboardDataSource>("demo");
  const [owners, setOwners] = useState<string[]>([]);
  const [loading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStats(computeDashboardStats(filters));
    setIndustry(
      industryTiles(loadIndustryPreset(), computeDashboardStats(filters)),
    );
    setCharts(chartsFromStats(computeDashboardStats(filters)));
    setExecutive(computeExecutiveOverview(filters));
    setSales(computeSalesDashboard(filters));
    setPerformance(computePerformanceDashboard(filters));

    void (async () => {
      const snap = await fetchLiveDashboardSnapshot(filters);
      if (cancelled) return;
      setStats(snap.stats);
      setIndustry(snap.industryTiles);
      setCharts(snap.charts);
      setExecutive(snap.executive);
      setSales(snap.sales);
      setPerformance(snap.performance);
      setSource(snap.source);
      if (snap.owners.length) setOwners(snap.owners);
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, tick]);

  return {
    stats,
    industry,
    charts,
    executive,
    sales,
    performance,
    source,
    owners,
    loading,
    refresh,
  };
}
