"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Download,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Settings2,
  Star,
} from "lucide-react";
import {
  DASHBOARD_OWNERS,
  DASHBOARD_TEAMS,
  DASHBOARD_WIDGETS,
  defaultDashboardLayout,
  exportDashboardReport,
  formatCurrency,
  loadDashboardLayout,
  moveWidgetTo,
  restoreDefaultDashboardLayout,
  widgetGridSpan,
  saveDashboardLayout,
  setDefaultDashboardLayout,
  type DashboardDateRange,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/dashboard/layout";
import {
  industryPresetLabel,
  loadIndustryPreset,
} from "@/lib/dashboard/industry";
import {
  DASHBOARD_ROLES,
  listRoleLayouts,
  loadActiveDashboardRole,
  loadRoleLayout,
  saveActiveDashboardRole,
  saveRoleLayout,
  type NamedDashboardLayout,
} from "@/lib/dashboard/role-layouts";
import { useCrmDashboardStats } from "@/lib/dashboard/use-crm-dashboard-stats";
import { UpcomingMeetingsCard } from "@/components/dashboard/static-cards";
import { DashboardKpiCharts } from "@/components/dashboard/DashboardKpiCharts";
import { DashboardTaskAttention } from "@/components/dashboard/DashboardTaskAttention";
import { WorkspaceActivityFeed } from "@/components/dashboard/WorkspaceActivityFeed";
import { DashboardWidgetSlot } from "@/components/dashboard/DashboardWidgetSlot";
import { cn } from "@/lib/utils";
import type { HierarchyLevel } from "@/lib/rules/permissions";

const DATE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function LiveKpiStrip({
  stats,
}: {
  stats: ReturnType<typeof useCrmDashboardStats>["stats"];
}) {
  const tiles = [
    { label: "Total Leads", value: String(stats.totalLeads) },
    { label: "Total Contacts", value: String(stats.totalContacts) },
    { label: "Total Companies", value: String(stats.totalCompanies) },
    { label: "Total Deals", value: String(stats.totalDeals) },
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue) },
    { label: "Won Deals Value", value: formatCurrency(stats.wonDealsValue) },
    { label: "Open Tasks", value: String(stats.openTasks) },
    { label: "Overdue Tasks", value: String(stats.overdueTasks) },
    { label: "Activities Today", value: String(stats.activitiesToday) },
    { label: "Conversion Rate", value: `${stats.conversionRate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <KpiTile key={t.label} label={t.label} value={t.value} />
      ))}
    </div>
  );
}

export function DashboardWorkspace() {
  const [layout, setLayout] = useState<DashboardLayout>(defaultDashboardLayout);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [role, setRole] = useState<HierarchyLevel>("Manager");
  const [roleLayouts, setRoleLayouts] = useState<NamedDashboardLayout[]>([]);
  const [layoutName, setLayoutName] = useState("");
  const [dragging, setDragging] = useState<DashboardWidgetId | null>(null);
  const [over, setOver] = useState<DashboardWidgetId | null>(null);
  const industry = loadIndustryPreset();

  const { stats, industry: industryTiles, charts, owners, loading, refresh } =
    useCrmDashboardStats(layout.filters);

  useEffect(() => {
    setLayout(loadDashboardLayout());
    const nextRole = loadActiveDashboardRole();
    setRole(nextRole);
    setRoleLayouts(listRoleLayouts(nextRole));
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

  const ownerOptions = owners.length ? owners : [...DASHBOARD_OWNERS];

  const visible = useMemo(
    () => new Set(layout.order.filter((id) => !layout.hidden.includes(id))),
    [layout],
  );

  function dropOn(target: DashboardWidgetId) {
    if (dragging && dragging !== target) {
      persist({
        ...layout,
        order: moveWidgetTo(layout.order, dragging, target),
      });
    }
    setDragging(null);
    setOver(null);
  }

  const sections = useMemo(() => {
    const out: ReactNode[] = [];

    for (const id of layout.order) {
      if (!visible.has(id)) continue;
      const span =
        widgetGridSpan(id) === "full" ? "xl:col-span-6" : "xl:col-span-2";

      let body: ReactNode = null;
      if (id === "kpis") {
        body = (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Core KPIs
            </p>
            <LiveKpiStrip stats={stats} />
          </div>
        );
      } else if (id === "charts") {
        body = <DashboardKpiCharts charts={charts} />;
      } else if (id === "industry") {
        body = (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              {industryPresetLabel(industry)} widgets
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {industryTiles.map((t) => (
                <div key={t.label} className="space-y-0.5">
                  <KpiTile label={t.label} value={t.value} />
                  {t.missingApi ? (
                    <p className="px-1 text-[10px] text-amber-700">
                      No API for this field yet
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      } else if (id === "activity") {
        body = <WorkspaceActivityFeed />;
      } else if (id === "meetings") {
        body = <UpcomingMeetingsCard />;
      } else if (id === "taskUpdates") {
        body = <DashboardTaskAttention />;
      }

      if (!body) continue;
      out.push(
        <DashboardWidgetSlot
          key={id}
          id={id}
          span={span}
          editing={customizeOpen}
          dragging={dragging}
          over={over}
          onDragStart={setDragging}
          onDragOver={setOver}
          onDrop={dropOn}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
        >
          {body}
        </DashboardWidgetSlot>,
      );
    }

    return out;
  }, [
    charts,
    customizeOpen,
    dragging,
    industry,
    industryTiles,
    layout,
    over,
    stats,
    visible,
  ]);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
    <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 p-4 lg:px-6 2xl:px-8 2xl:py-5">
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
            {ownerOptions.map((o) => (
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
          {flash ? (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              {flash}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              refresh();
              setFlash("Refreshing dashboard data");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
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
              exportDashboardReport(stats);
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
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-violet-900">
            Drag widgets on the dashboard
          </p>
          <p className="text-[11px] text-violet-800/80">
            Grab the handle on a card and drop it on another card to move it
            up, down, left, or right.
          </p>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_WIDGETS.map((w) => {
              const hidden = layout.hidden.includes(w.id);
              return (
                <label
                  key={w.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => {
                      const hiddenNext = hidden
                        ? layout.hidden.filter((h) => h !== w.id)
                        : [...layout.hidden, w.id];
                      persist({ ...layout, hidden: hiddenNext });
                    }}
                    className="accent-violet-600"
                  />
                  {w.label}
                </label>
              );
            })}
          </div>

          <div className="border-t border-violet-200/80 pt-3">
            <p className="mb-2 text-xs font-semibold text-foreground">
              Save layouts per role
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value as HierarchyLevel;
                  setRole(next);
                  saveActiveDashboardRole(next);
                  setRoleLayouts(listRoleLayouts(next));
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
              >
                {DASHBOARD_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Layout name"
                className="min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  const saved = saveRoleLayout(role, layoutName, layout);
                  setRoleLayouts(saved);
                  setFlash(`Saved “${layoutName.trim() || "Untitled"}” for ${role}`);
                  setLayoutName("");
                }}
                className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
              >
                Save for role
              </button>
              {roleLayouts.length ? (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const name = e.target.value;
                    if (!name) return;
                    const next = loadRoleLayout(role, name);
                    if (next) {
                      persist(next);
                      setFlash(`Loaded ${role} layout “${name}”`);
                    }
                    e.target.value = "";
                  }}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="">Load saved…</option>
                  {roleLayouts.map((row) => (
                    <option key={row.name} value={row.name}>
                      {row.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">{sections}</div>
    </div>
    </div>
  );
}
