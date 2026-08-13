"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  LayoutGrid,
  RotateCcw,
  Settings2,
  Star,
} from "lucide-react";
import {
  computeDashboardStats,
  DASHBOARD_OWNERS,
  DASHBOARD_TEAMS,
  DASHBOARD_WIDGETS,
  defaultDashboardLayout,
  exportDashboardReport,
  formatCurrency,
  loadDashboardLayout,
  moveWidget,
  restoreDefaultDashboardLayout,
  saveDashboardLayout,
  setDefaultDashboardLayout,
  type DashboardDateRange,
  type DashboardLayout,
} from "@/lib/dashboard/layout";
import { onRulesChange } from "@/lib/rules";
import {
  DashboardBreadcrumb,
  OrderByTimeCard,
  UpcomingMeetingsCard,
} from "@/components/dashboard/static-cards";
import { CardGridSkeleton, ChartSkeleton } from "@/components/ui/chart-skeleton";
import { cn } from "@/lib/utils";

const DashboardMetricsSection = dynamic(
  () =>
    import("@/components/dashboard/DashboardMetricsSection").then(
      (m) => m.DashboardMetricsSection,
    ),
  { loading: () => <CardGridSkeleton count={4} /> },
);

const DashboardChartRow = dynamic(
  () =>
    import("@/components/dashboard/DashboardAnalyticsSection").then(
      (m) => m.DashboardChartRow,
    ),
  { loading: () => <CardGridSkeleton count={2} /> },
);

const DashboardDealsRow = dynamic(
  () =>
    import("@/components/dashboard/DashboardAnalyticsSection").then(
      (m) => m.DashboardDealsRow,
    ),
  { loading: () => <CardGridSkeleton count={2} /> },
);

const NewCustomersTable = dynamic(
  () => import("@/components/dashboard/NewCustomersTable"),
  { loading: () => <ChartSkeleton className="min-h-[420px]" /> },
);

const TaskUpdateCard = dynamic(
  () => import("@/components/dashboard/TaskUpdateCard"),
  { loading: () => <ChartSkeleton className="min-h-[420px]" /> },
);

const DATE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

function LiveKpiStrip({ layout }: { layout: DashboardLayout }) {
  const [stats, setStats] = useState(() =>
    computeDashboardStats(layout.filters),
  );

  useEffect(() => {
    function refresh() {
      setStats(computeDashboardStats(layout.filters));
    }
    refresh();
    return onRulesChange(refresh);
  }, [layout.filters]);

  const tiles = [
    { label: "Total Leads", value: String(stats.totalLeads) },
    { label: "Total Contacts", value: String(stats.totalContacts) },
    { label: "Total Companies", value: String(stats.totalCompanies) },
    { label: "Total Deals", value: String(stats.totalDeals) },
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue) },
    { label: "Won Deals", value: formatCurrency(stats.wonDealsValue) },
    { label: "Open Tasks", value: String(stats.openTasks) },
    { label: "Overdue Tasks", value: String(stats.overdueTasks) },
    { label: "Activities Today", value: String(stats.activitiesToday) },
    { label: "Conversion Rate", value: `${stats.conversionRate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl border border-border bg-white px-3 py-2.5"
        >
          <p className="text-[11px] font-medium text-muted-foreground">
            {t.label}
          </p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            {t.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DashboardWorkspace() {
  const [layout, setLayout] = useState<DashboardLayout>(defaultDashboardLayout);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setLayout(loadDashboardLayout());
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 3500);
    return () => window.clearTimeout(t);
  }, [flash]);

  function persist(next: DashboardLayout) {
    setLayout(next);
    saveDashboardLayout(next);
  }

  const visible = useMemo(
    () => new Set(layout.order.filter((id) => !layout.hidden.includes(id))),
    [layout],
  );

  const sections = useMemo(() => {
    const out: ReactNode[] = [];
    const done = new Set<string>();

    for (const id of layout.order) {
      if (!visible.has(id)) continue;

      if (id === "metrics" && !done.has("metrics")) {
        done.add("metrics");
        out.push(
          <div key="metrics" className="space-y-3">
            <LiveKpiStrip layout={layout} />
            <DashboardMetricsSection />
          </div>,
        );
      }

      if (
        (id === "charts" || id === "orderByTime") &&
        !done.has("charts-row") &&
        (visible.has("charts") || visible.has("orderByTime"))
      ) {
        done.add("charts-row");
        out.push(
          <div key="charts-row" className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {visible.has("charts") ? (
              <div
                className={
                  visible.has("orderByTime") ? "lg:col-span-3" : "lg:col-span-4"
                }
              >
                <DashboardChartRow />
              </div>
            ) : null}
            {visible.has("orderByTime") ? <OrderByTimeCard /> : null}
          </div>,
        );
      }

      if (
        (id === "meetings" || id === "deals") &&
        !done.has("mid-row") &&
        (visible.has("meetings") || visible.has("deals"))
      ) {
        done.add("mid-row");
        out.push(
          <div key="mid-row" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {visible.has("meetings") ? <UpcomingMeetingsCard /> : null}
            {visible.has("deals") ? (
              <div
                className={
                  visible.has("meetings") ? "lg:col-span-2" : "lg:col-span-3"
                }
              >
                <DashboardDealsRow />
              </div>
            ) : null}
          </div>,
        );
      }

      if (
        (id === "customers" || id === "taskUpdates") &&
        !done.has("bottom-row") &&
        (visible.has("customers") || visible.has("taskUpdates"))
      ) {
        done.add("bottom-row");
        out.push(
          <div
            key="bottom-row"
            className={cn(
              "grid grid-cols-1 gap-4",
              visible.has("customers") && visible.has("taskUpdates")
                ? "lg:grid-cols-[1fr_420px]"
                : "",
            )}
          >
            {visible.has("customers") ? (
              <div className="min-w-0">
                <NewCustomersTable />
              </div>
            ) : null}
            {visible.has("taskUpdates") ? <TaskUpdateCard /> : null}
          </div>,
        );
      }
    }

    return out;
  }, [layout, visible]);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
    <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 p-4 lg:px-6 2xl:px-8 2xl:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardBreadcrumb />
        {flash ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {flash}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Date
          <select
            value={layout.filters.dateRange}
            onChange={(e) =>
              persist({
                ...layout,
                filters: {
                  ...layout.filters,
                  dateRange: e.target.value as DashboardDateRange,
                },
              })
            }
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Owner
          <select
            value={layout.filters.owner}
            onChange={(e) =>
              persist({
                ...layout,
                filters: { ...layout.filters, owner: e.target.value },
              })
            }
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {DASHBOARD_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Team
          <select
            value={layout.filters.team}
            onChange={(e) =>
              persist({
                ...layout,
                filters: {
                  ...layout.filters,
                  team: e.target.value as DashboardLayout["filters"]["team"],
                },
              })
            }
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {DASHBOARD_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCustomizeOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              customizeOpen
                ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Customize
          </button>
          <button
            type="button"
            onClick={() => {
              setDefaultDashboardLayout(layout);
              setFlash("Saved as default dashboard");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Star className="h-3.5 w-3.5" />
            Set default
          </button>
          <button
            type="button"
            onClick={() => {
              persist(restoreDefaultDashboardLayout());
              setFlash("Restored default layout");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              exportDashboardReport(computeDashboardStats(layout.filters));
              setFlash("Dashboard report downloaded");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {customizeOpen ? (
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Widgets — show / hide / rearrange
          </p>
          <ul className="space-y-1.5">
            {layout.order.map((id) => {
              const meta = DASHBOARD_WIDGETS.find((w) => w.id === id)!;
              const hidden = layout.hidden.includes(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => {
                      const hiddenNext = hidden
                        ? layout.hidden.filter((h) => h !== id)
                        : [...layout.hidden, id];
                      persist({ ...layout, hidden: hiddenNext });
                    }}
                  />
                  <span className="flex-1 text-foreground">{meta.label}</span>
                  <button
                    type="button"
                    onClick={() =>
                      persist({
                        ...layout,
                        order: moveWidget(layout.order, id, -1),
                      })
                    }
                    className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      persist({
                        ...layout,
                        order: moveWidget(layout.order, id, 1),
                      })
                    }
                    className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                  >
                    Down
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sections}
    </div>
    </div>
  );
}
