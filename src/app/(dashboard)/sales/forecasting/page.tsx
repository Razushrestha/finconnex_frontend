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

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
      <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Link href="/" className="flex items-center gap-1 hover:text-slate-600">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-slate-500">Sales</span>
        <span>&gt;</span>
        <span className="text-slate-600">Forecasting</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sales Forecasting &amp; Territory
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Roll-up by owner and territory · SRS §6.5
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">Period</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ForecastPeriod)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-2xs focus:border-violet-300 focus:outline-none"
          >
            {FORECAST_PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(
          [
            ["Pipeline", totals.pipeline],
            ["Best Case", totals.bestCase],
            ["Committed", totals.committed],
            ["Closed", totals.closed],
            ["Quota", totals.quota],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatAud(value)}
            </p>
            <p className="text-[10px] text-slate-400">{period} view</p>
          </div>
        ))}
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-slate-800">
            Forecast by Owner
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              <tr>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Territory</th>
                <th className="px-3 py-2.5">Pipeline</th>
                <th className="px-3 py-2.5">Best Case</th>
                <th className="px-3 py-2.5">Committed</th>
                <th className="px-3 py-2.5">Closed</th>
                <th className="px-3 py-2.5">Quota</th>
                <th className="px-3 py-2.5">Attainment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {FORECAST_ROWS.map((row) => {
                const attainment = Math.round((row.closed / row.quota) * 100);
                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {row.owner}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {row.territory}
                    </td>
                    <td className="px-3 py-2.5">{formatAud(row.pipeline)}</td>
                    <td className="px-3 py-2.5">{formatAud(row.bestCase)}</td>
                    <td className="px-3 py-2.5">{formatAud(row.committed)}</td>
                    <td className="px-3 py-2.5 font-medium text-emerald-700">
                      {formatAud(row.closed)}
                    </td>
                    <td className="px-3 py-2.5">{formatAud(row.quota)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${Math.min(attainment, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">
                          {attainment}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-slate-800">
            Territories
          </h2>
          <p className="text-[11px] text-slate-500">
            Rules for region, postcode, industry, and account size
          </p>
        </div>
        <div className="divide-y divide-slate-50">
          {TERRITORIES.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-slate-900">
                  {t.name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{t.rules}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium text-slate-700">
                  {t.owner}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t.accountCount} accounts
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
