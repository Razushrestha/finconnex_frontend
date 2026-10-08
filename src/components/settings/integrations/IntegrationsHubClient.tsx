"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type IntegrationCategory,
} from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

import {
  IntegrationLogo,
  isIntegrationConnected,
  useIntegrationStatuses,
} from "./integration-shared";

/**
 * Settings → Integrations: every third-party connection in one place, as
 * logo tiles. Each tile opens that integration's own page, in a new tab.
 */
export function IntegrationsHubClient() {
  const { statuses, loading } = useIntegrationStatuses();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "All">("All");

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
            <a
              key={item.id}
              href={`/settings/integrations/${item.id}`}
              target="_blank"
              rel="noopener"
              title={`Open ${item.name} in a new tab`}
              className="group relative flex h-44 flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-4 text-center transition-shadow hover:border-slate-300 hover:shadow-md"
            >
              {connected ? (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Connected
                </span>
              ) : null}
              <ExternalLink
                aria-hidden
                className="absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100"
              />
              <IntegrationLogo item={item} />
              <span className="text-[15px] font-semibold text-slate-900">
                {item.name}
              </span>
            </a>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">
          No integrations match “{query}”.
        </p>
      ) : null}
    </div>
  );
}
