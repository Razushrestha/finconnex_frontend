"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  FORECAST_PERIODS,
  FORECAST_ROWS,
  TERRITORIES,
  formatAud,
  type ForecastPeriod,
} from "@/lib/forecasting/types";
import { cn } from "@/lib/utils";

function attainmentPct(closed: number, quota: number) {
  if (!quota) return 0;
  return Math.round((closed / quota) * 100);
}

export default function ForecastingPage() {
  const [period, setPeriod] = useState<ForecastPeriod>("Quarter");

  const totals = useMemo(() => {
    return FORECAST_ROWS.reduce(
      (acc, row) => ({
        pipeline: acc.pipeline + row.pipeline,
        bestCase: acc.bestCase + row.bestCase,
        committed: acc.committed + row.committed,
        closed: acc.closed + row.closed,
        quota: acc.quota + row.quota,
      }),
      { pipeline: 0, bestCase: 0, committed: 0, closed: 0, quota: 0 },
    );
  }, []);

  const teamAttainment = attainmentPct(totals.closed, totals.quota);

  const metrics: { label: string; value: number; emphasize?: boolean }[] = [
    { label: "Pipeline", value: totals.pipeline },
    { label: "Best case", value: totals.bestCase },
    { label: "Committed", value: totals.committed },
    { label: "Closed", value: totals.closed, emphasize: true },
    { label: "Quota", value: totals.quota },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <nav className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <Link
              href="/"
              className="flex items-center gap-0.5 hover:text-slate-600"
            >
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <span>Sales</span>
            <span>/</span>
            <span className="text-slate-600">Forecasting</span>
          </nav>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">
              Sales Forecasting
            </h1>
            <p className="text-[12px] text-slate-500">
              Owner roll-up · {period}
            </p>
          </div>
        </div>

        <div
          className="inline-flex rounded border border-slate-200 bg-white p-0.5"
          role="group"
          aria-label="Forecast period"
        >
          {FORECAST_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "h-7 rounded px-2.5 text-[11px] font-medium transition-colors",
                period === p
                  ? "bg-violet-600 text-white"
                  : "text-slate-600 hover:bg-violet-50 hover:text-violet-700",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
          {metrics.map((m) => (
            <div key={m.label} className="px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {m.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-[17px] font-semibold tabular-nums tracking-tight",
                  m.emphasize ? "text-violet-700" : "text-slate-900",
                )}
              >
                {formatAud(m.value)}
              </p>
            </div>
          ))}
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Attainment
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-[17px] font-semibold tabular-nums text-violet-700">
                {teamAttainment}%
              </p>
              <div className="h-1.5 min-w-[56px] flex-1 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${Math.min(teamAttainment, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast table */}
      <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-slate-900">
            Forecast by owner
          </h2>
          <p className="text-[12px] text-slate-400">
            {FORECAST_ROWS.length} owners
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Territory</th>
                <th className="px-3 py-2 font-medium">Pipeline</th>
                <th className="px-3 py-2 font-medium">Best case</th>
                <th className="px-3 py-2 font-medium">Committed</th>
                <th className="px-3 py-2 font-medium">Closed</th>
                <th className="px-3 py-2 font-medium">Quota</th>
                <th className="min-w-[140px] px-3 py-2 font-medium">
                  Attainment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {FORECAST_ROWS.map((row) => {
                const attainment = attainmentPct(row.closed, row.quota);
                return (
                  <tr
                    key={row.id}
                    className="h-10 transition-colors hover:bg-violet-50/40"
                  >
                    <td className="px-3 py-1.5 font-medium text-slate-900">
                      {row.owner}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {row.territory}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatAud(row.pipeline)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatAud(row.bestCase)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatAud(row.committed)}
                    </td>
                    <td className="px-3 py-1.5 font-medium tabular-nums text-violet-700">
                      {formatAud(row.closed)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatAud(row.quota)}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-violet-100">
                          <div
                            className="h-full rounded-full bg-violet-600"
                            style={{
                              width: `${Math.min(attainment, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-[12px] font-medium tabular-nums text-slate-700">
                          {attainment}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50/80 text-[12.5px] font-semibold text-slate-900">
              <tr>
                <td className="px-3 py-2.5" colSpan={2}>
                  Team total
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatAud(totals.pipeline)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatAud(totals.bestCase)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatAud(totals.committed)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-violet-700">
                  {formatAud(totals.closed)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatAud(totals.quota)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-violet-700">
                  {teamAttainment}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Territories */}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
          <h2 className="text-[13px] font-semibold text-slate-900">
            Territories
          </h2>
          <p className="text-[11px] text-slate-400">
            {TERRITORIES.length} regions
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-violet-50/60 text-[11px] font-medium tracking-wide text-violet-700 uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Territory</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Rules</th>
                <th className="px-3 py-2 text-right font-medium">Accounts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {TERRITORIES.map((t) => (
                <tr
                  key={t.id}
                  className="h-9 transition-colors hover:bg-violet-50/40"
                >
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                      {t.name}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-violet-700">
                    {t.owner}
                  </td>
                  <td className="px-3 py-1.5 text-[12px] text-slate-500">
                    {t.rules}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <span className="inline-flex min-w-[2rem] justify-end rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 tabular-nums">
                      {t.accountCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
