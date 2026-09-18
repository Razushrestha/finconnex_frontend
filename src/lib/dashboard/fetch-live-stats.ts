/** Overlay dashboard KPIs from live CRM dashboard widgets when those exist. */

import {
  chartsFromStats,
  type DashboardChartData,
} from "@/lib/dashboard/charts";
import {
  computeDashboardStats,
  type DashboardFilters,
  type DashboardLiveStats,
} from "@/lib/dashboard/layout";
import {
  batchCrmDashboardWidgets,
  getCrmDashboardMetrics,
  listCrmDashboardWidgetCatalog,
} from "@/lib/dashboard/api";
import {
  computeExecutiveOverview,
  type ExecutiveOverview,
} from "@/lib/dashboard/executive";
import {
  industryTiles,
  loadIndustryPreset,
  type DashboardIndustryTile,
} from "@/lib/dashboard/industry";
import {
  applyMetricsToStats,
  overlayExecutiveOverview,
  widgetPayloadMap,
} from "@/lib/dashboard/overlay";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

export type DashboardDataSource = "api" | "demo" | "partial";

export type LiveDashboardSnapshot = {
  stats: DashboardLiveStats;
  source: DashboardDataSource;
  industryTiles: DashboardIndustryTile[];
  charts: DashboardChartData;
  owners: string[];
  liveHits: string[];
  executive: ExecutiveOverview;
};

async function settle<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function localSnapshot(
  filters: DashboardFilters,
): LiveDashboardSnapshot {
  const stats = computeDashboardStats(filters);
  const executive = computeExecutiveOverview(filters);
  return {
    stats,
    source: "demo",
    industryTiles: industryTiles(loadIndustryPreset(), stats),
    charts: chartsFromStats(stats),
    owners: [],
    liveHits: [],
    executive,
  };
}

export async function fetchLiveDashboardSnapshot(
  filters: DashboardFilters,
): Promise<LiveDashboardSnapshot> {
  const demo = localSnapshot(filters);
  const [metrics, catalog] = await Promise.all([
    settle(() => getCrmDashboardMetrics(filters)),
    settle(() => listCrmDashboardWidgetCatalog()),
  ]);
  if (metrics == null && !catalog?.length) {
    return demo;
  }

  const widgetKeys = catalog?.map((w) => w.key).filter(Boolean) ?? [];
  const batchKeys = widgetKeys.length
    ? widgetKeys
    : ["kpis", "pipeline", "performance", "actions", "trend", "ranking", "alerts"];
  const widgetsRaw = await settle(() =>
    batchCrmDashboardWidgets(batchKeys, filters),
  );
  if (metrics == null && widgetsRaw == null) {
    return demo;
  }

  const widgetMap = widgetPayloadMap(widgetsRaw);
  const liveHits: string[] = [];
  if (metrics != null) liveHits.push("dashboard");
  if (catalog?.length) liveHits.push("widget-catalog");
  if (widgetsRaw != null) liveHits.push("widget-batch");
  const stats = applyMetricsToStats({ ...demo.stats }, metrics);
  const executive = overlayExecutiveOverview(
    demo.executive,
    metrics,
    widgetMap,
  );
  const members = await settle(() => listCrmWorkspaceMembers());
  const memberList = members ?? [];
  const owners = [
    "All",
    ...new Set(memberList.map((m) => m.name).filter(Boolean)),
  ];
  const trendHasData = executive.trend.some(
    (p) => p.leads || p.deals || p.settlements,
  );
  return {
    stats,
    source:
      liveHits.includes("dashboard") || liveHits.includes("widget-batch")
        ? "api"
        : "partial",
    industryTiles: industryTiles(loadIndustryPreset(), stats),
    charts: chartsFromStats(
      stats,
      trendHasData
        ? executive.trend.map((p) => ({
            month: p.label,
            leads: p.leads,
            deals: p.deals,
            won: p.settlements,
          }))
        : [],
    ),
    owners: owners.length > 1 ? owners : [],
    liveHits,
    executive,
  };
}
