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
  DASHBOARD_ANALYTICS_WIDGETS,
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
  overlayPerformanceDashboard,
  overlaySalesDashboard,
  widgetPayloadMap,
} from "@/lib/dashboard/overlay";
import {
  computePerformanceDashboard,
  type PerformanceDashboard,
} from "@/lib/dashboard/performance";
import {
  computeSalesDashboard,
  type SalesDashboard,
} from "@/lib/dashboard/sales";
import { isUuid } from "@/lib/activity-timeline/auth";
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
  sales: SalesDashboard;
  performance: PerformanceDashboard;
};

async function settle<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function localSnapshot(filters: DashboardFilters): LiveDashboardSnapshot {
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
    sales: computeSalesDashboard(filters),
    performance: computePerformanceDashboard(filters),
  };
}

export function dashboardFastWidgetKeys(catalogKeys: string[]): string[] {
  const defaults = [...DASHBOARD_ANALYTICS_WIDGETS];
  if (!catalogKeys.length) return defaults;
  const allow = new Set(defaults);
  const picked = catalogKeys.filter((key) => allow.has(key as (typeof defaults)[number]));
  return picked.length ? picked : defaults;
}

function ownerUserId(
  members: Array<{ name: string; userId: string }>,
  owner: string,
): string | undefined {
  if (!owner || owner === "All") return undefined;
  const match = members.find(
    (row) => row.name === owner || row.userId === owner,
  );
  const id = match?.userId;
  return id && isUuid(id) ? id : undefined;
}

export async function fetchLiveDashboardSnapshot(
  filters: DashboardFilters,
): Promise<LiveDashboardSnapshot> {
  const demo = localSnapshot(filters);
  const members = (await settle(() => listCrmWorkspaceMembers())) ?? [];
  const ownerId = ownerUserId(members, filters.owner);
  const [metrics, catalog] = await Promise.all([
    settle(() => getCrmDashboardMetrics(filters, ownerId)),
    settle(() => listCrmDashboardWidgetCatalog()),
  ]);
  const widgetsRaw = await settle(() =>
    batchCrmDashboardWidgets(
      dashboardFastWidgetKeys(catalog?.map((w) => w.key).filter(Boolean) ?? []),
      filters,
      ownerId,
    ),
  );
  if (metrics == null && widgetsRaw == null) {
    return {
      ...demo,
      owners: members.map((m) => m.name).filter(Boolean),
    };
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
  const sales = overlaySalesDashboard(demo.sales, metrics, widgetMap);
  const performance = overlayPerformanceDashboard(
    demo.performance,
    metrics,
    widgetMap,
  );
  const owners = [
    "All",
    ...new Set(members.map((m) => m.name).filter(Boolean)),
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
    sales,
    performance,
  };
}
