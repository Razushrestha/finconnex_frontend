"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { WorkspacePortal } from "@/components/shared/WorkspacePortal";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type IntegrationCategory,
} from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

import {
  IntegrationLogo,
  IntegrationPanel,
  isIntegrationConnected,
  useIntegrationStatuses,
} from "./integration-shared";

/**
 * Settings → Integrations: every third-party connection in one place, as
 * logo tiles. A tile opens that integration's setup in a panel inside the
 * working area; its "Integrate" button opens the app's own page in a new tab.
 */
export function IntegrationsHubClient() {
  const { statuses, loading, refresh } = useIntegrationStatuses();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.blurb.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const open = INTEGRATIONS.find((item) => item.id === openId) ?? null;
  const connectedCount = INTEGRATIONS.filter((item) =>
    isIntegrationConnected(item, statuses),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Integrations</h1>
          <p className="text-[13px] text-slate-500">
            Connect the apps FinConnex works with.
            {loading ? "" : ` ${connectedCount} connected.`}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations"
            aria-label="Search integrations"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-[13px] outline-none focus:border-[var(--brand-primary)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["All", ...INTEGRATION_CATEGORIES] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-medium",
              category === item
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary-faint)] text-[var(--brand-primary)]"
                : "border-slate-200 text-slate-600 hover:border-slate-300",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visible.map((item) => {
          const connected = isIntegrationConnected(item, statuses);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(item.id)}
              className="relative flex h-44 flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-4 text-center transition-shadow hover:border-slate-300 hover:shadow-md"
            >
              {connected ? (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Connected
                </span>
              ) : null}
              <IntegrationLogo item={item} />
              <span className="text-[15px] font-semibold text-slate-900">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">
          No integrations match “{query}”.
        </p>
      ) : null}

      {open ? (
        <WorkspacePortal>
          <div
            className="fixed inset-0 z-[90] flex justify-end bg-slate-900/30"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpenId(null);
            }}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={open.name}
              className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <IntegrationLogo item={open} size={40} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-semibold text-slate-900">
                    {open.name}
                  </h2>
                  <p className="text-[12px] text-slate-500">{open.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <IntegrationPanel
                  item={open}
                  statuses={statuses}
                  onChanged={refresh}
                />
              </div>
            </aside>
          </div>
        </WorkspacePortal>
      ) : null}
    </div>
  );
}
