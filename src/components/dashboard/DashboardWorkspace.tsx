"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Crown,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings2,
  Star,
} from "lucide-react";
import {
  defaultDashboardLayout,
  loadDashboardLayout,
  moveWidgetTo,
  restoreDefaultDashboardLayout,
  widgetGridSpan,
  saveDashboardLayout,
  setDefaultDashboardLayout,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/dashboard/layout";
import { computeExecutiveOverview } from "@/lib/dashboard/executive";
import {
  DASHBOARD_VIEWS,
  isDashboardViewId,
  loadDashboardView,
  saveDashboardView,
  type DashboardViewId,
} from "@/lib/dashboard/views";
import {
  loadViewHidden,
  loadViewOrder,
  moveViewWidget,
  resetViewOrder,
  restoreDefaultViewHidden,
  saveViewHidden,
  saveViewOrder,
  setDefaultViewHidden,
} from "@/lib/dashboard/view-widgets";
import { SalesDashboardView } from "@/components/dashboard/SalesDashboardView";
import { PerformanceDashboardView } from "@/components/dashboard/PerformanceDashboardView";
import { WorkQueueDashboardView } from "@/components/dashboard/WorkQueueDashboardView";
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
import { WorkspaceActivityFeed } from "@/components/dashboard/WorkspaceActivityFeed";
import {
  DashboardWidgetSlot,
  dashboardReorderCanvas,
} from "@/components/dashboard/DashboardWidgetSlot";
import {
  AlertsInsights,
  CriticalActions,
  ExecutiveFooter,
  ExecutiveKpis,
  PerformanceSnapshot,
  PipelineGlance,
  TopPerforming,
  TrendOverview,
} from "@/components/dashboard/ExecutiveOverview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";
import type { HierarchyLevel } from "@/lib/rules/permissions";

function greetingName() {
  const hour = new Date().getHours();
  const when = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const full = getRulesActor().name || "there";
  return `${when}, ${full.split(" ")[0]} 👋`;
}

function spanClass(id: DashboardWidgetId) {
  const span = widgetGridSpan(id);
  if (span === "full") return "xl:col-span-6";
  if (span === "half") return "xl:col-span-3";
  return "xl:col-span-2";
}

export function DashboardWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<DashboardViewId>("executive");
  const [layout, setLayout] = useState<DashboardLayout>(defaultDashboardLayout);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [role, setRole] = useState<HierarchyLevel>("Manager");
  const [roleLayouts, setRoleLayouts] = useState<NamedDashboardLayout[]>([]);
  const [layoutName, setLayoutName] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [hello, setHello] = useState("Good morning.");
  const [viewHidden, setViewHidden] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { loading } = useCrmDashboardStats(layout.filters);
  const executive = useMemo(
    () => computeExecutiveOverview(layout.filters),
    [layout.filters, loading],
  );

  useEffect(() => {
    const stored = loadDashboardLayout();
    const next =
      stored.filters.owner === "All"
        ? stored
        : { ...stored, filters: { ...stored.filters, owner: "All" } };
    setLayout(next);
    if (next !== stored) saveDashboardLayout(next);
    const nextRole = loadActiveDashboardRole();
    setRole(nextRole);
    setRoleLayouts(listRoleLayouts(nextRole));
    setHello(greetingName());
    const fromUrl = searchParams.get("view");
    const initial = isDashboardViewId(fromUrl) ? fromUrl : loadDashboardView();
    setView(initial);
    setViewHidden(loadViewHidden(initial));
    setViewOrder(loadViewOrder(initial));
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("view");
    if (isDashboardViewId(fromUrl)) {
      setView(fromUrl);
      setViewHidden(loadViewHidden(fromUrl));
      setViewOrder(loadViewOrder(fromUrl));
    }
  }, [searchParams]);

  useEffect(() => {
    function sync() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!fullscreen || document.fullscreenElement) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function switchView(next: DashboardViewId) {
    setView(next);
    setViewHidden(loadViewHidden(next));
    setViewOrder(loadViewOrder(next));
    saveDashboardView(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "executive") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

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

  function dropOn(target: string) {
    if (dragging && dragging !== target) {
      if (view === "executive") {
        persist({
          ...layout,
          order: moveWidgetTo(
            layout.order,
            dragging as DashboardWidgetId,
            target as DashboardWidgetId,
          ),
        });
      } else {
        const next = moveViewWidget(viewOrder, dragging, target);
        setViewOrder(next);
        saveViewOrder(view, next);
      }
    }
    setDragging(null);
    setOver(null);
  }

  async function toggleFullscreen() {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await el.requestFullscreen();
    } catch {
      setFullscreen((open) => !open);
    }
  }

  function archiveWidget(id: string) {
    if (view === "executive") {
      if (layout.hidden.includes(id as DashboardWidgetId)) return;
      persist({ ...layout, hidden: [...layout.hidden, id as DashboardWidgetId] });
      return;
    }
    if (viewHidden.includes(id)) return;
    const next = [...viewHidden, id];
    setViewHidden(next);
    saveViewHidden(view, next);
  }

  const reorderProps = {
    widgetOrder: viewOrder,
    hiddenWidgets: viewHidden,
    reordering: false,
    dragging,
    over,
    onDragStart: setDragging,
    onDragOver: setOver,
    onDrop: dropOn,
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
    onArchive: archiveWidget,
  };

  const sections = useMemo(() => {
    const out: ReactNode[] = [];

    for (const id of layout.order) {
      if (!visible.has(id)) continue;

      let body: ReactNode = null;
      if (id === "kpis") body = <ExecutiveKpis data={executive} />;
      else if (id === "pipeline") body = <PipelineGlance data={executive} />;
      else if (id === "performance") body = <PerformanceSnapshot data={executive} />;
      else if (id === "actions") body = <CriticalActions data={executive} />;
      else if (id === "trend") body = <TrendOverview data={executive} />;
      else if (id === "ranking") body = <TopPerforming data={executive} />;
      else if (id === "alerts") body = <AlertsInsights data={executive} />;
      else if (id === "activity") body = <WorkspaceActivityFeed />;
      else if (id === "meetings") body = <UpcomingMeetingsCard />;

      if (!body) continue;
      out.push(
        <DashboardWidgetSlot
          key={id}
          id={id}
          span={spanClass(id)}
          editing={false}
          dragging={dragging}
          over={over}
          onDragStart={setDragging}
          onDragOver={setOver}
          onDrop={dropOn}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onArchive={archiveWidget}
          size={id === "kpis" ? "auto" : "card"}
        >
          {body}
        </DashboardWidgetSlot>,
      );
    }

    return out;
  }, [customizeOpen, dragging, executive, layout, over, visible]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "dashboard-workspace flex flex-1 flex-col bg-[#F4F6F9]",
        fullscreen && "overflow-y-auto",
        fullscreen && !document.fullscreenElement && "fixed inset-0 z-[80]",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Crown className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {hello}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <label className="relative">
                <select
                  value={view}
                  onChange={(e) => switchView(e.target.value as DashboardViewId)}
                  className="h-10 min-w-[13.5rem] appearance-none rounded-full border border-slate-200 bg-white py-2 pr-10 pl-4 text-[13px] font-semibold text-slate-800 outline-none hover:bg-slate-50"
                >
                  {DASHBOARD_VIEWS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Manage dashboard"
                  title="Manage dashboard"
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#5A32A3] outline-none hover:bg-violet-50",
                    fullscreen && "bg-violet-50 ring-1 ring-violet-200",
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuItem className="text-[13px]" onClick={() => void toggleFullscreen()}>
                    {fullscreen ? (
                      <Minimize2 className="h-4 w-4 text-[#5A32A3]" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-[#5A32A3]" />
                    )}
                    {fullscreen ? "Exit full screen" : "View full screen"}
                  </DropdownMenuItem>
                  <DashboardDateRangePicker
                    filters={layout.filters}
                    onChange={(next) =>
                      persist({
                        ...layout,
                        filters: { ...layout.filters, ...next, owner: "All" },
                      })
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {flash ? <span className="text-xs text-emerald-700">{flash}</span> : null}
              {customizeOpen ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (view === "executive") {
                        setDefaultDashboardLayout(layout);
                      } else {
                        setDefaultViewHidden(view, viewHidden);
                      }
                      setFlash("Saved as default dashboard");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Set default
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (view === "executive") {
                        persist(restoreDefaultDashboardLayout());
                      } else {
                        setViewHidden(restoreDefaultViewHidden(view));
                        setViewOrder(resetViewOrder(view));
                      }
                      setFlash("Restored default layout");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {view === "executive" ? (
          <>
            {executive.newLeads === 0 &&
            executive.settlements === 0 &&
            layout.filters.dateRange !== "all" ? (
              <p className="text-[12px] text-slate-500">
                No new leads or settlements in this timeframe. Pipeline, actions, and
                rankings still use live records — try Last 90 days or All time to
                include earlier activity.
              </p>
            ) : null}
            <div className={cn("grid grid-cols-1 gap-3 xl:grid-cols-6", dashboardReorderCanvas(false))}>
              {sections}
            </div>
            <ExecutiveFooter data={executive} />
          </>
        ) : null}
        {view === "sales" ? (
          <SalesDashboardView
            filters={layout.filters}
            {...reorderProps}
          />
        ) : null}
        {view === "performance" ? (
          <PerformanceDashboardView
            filters={layout.filters}
            {...reorderProps}
          />
        ) : null}
        {view === "work-queue" ? (
          <WorkQueueDashboardView
            filters={layout.filters}
            {...reorderProps}
          />
        ) : null}
      </div>
    </div>
  );
}
