"use client";

import type { ReactNode } from "react";
import {
  ClipboardList,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { compactFinanceMoney } from "@/lib/finance/hub-metrics";
import { cn } from "@/lib/utils";

export function TopMetricCards({
  totalRevenue,
  revenueDeltaLabel,
  pendingEstimates,
  pendingEstimateValue,
  overdueInvoices,
  overdueTotal,
  quoteConversion,
  quoteConversionLabel,
}: {
  totalRevenue: number;
  revenueDeltaLabel: string;
  pendingEstimates: number;
  pendingEstimateValue: number;
  overdueInvoices: number;
  overdueTotal: number;
  quoteConversion: number;
  quoteConversionLabel: string;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B4BDB] via-[#6E5AE8] to-[#8B6CF6] p-5 text-white shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-40">
          <svg viewBox="0 0 320 64" className="h-full w-full" preserveAspectRatio="none">
            <path
              d="M0 48 C40 44 48 28 80 30 C112 32 120 18 160 20 C200 22 208 36 248 28 C280 22 300 14 320 18 L320 64 L0 64 Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="relative flex items-start justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-white/80">
            Total Revenue (YTD)
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Wallet className="h-4 w-4" />
          </span>
        </div>
        <p className="relative mt-3 text-[28px] font-bold tracking-tight">
          {compactFinanceMoney(totalRevenue)}
        </p>
        <p className="relative mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-200">
          <TrendingUp className="h-3 w-3" />
          {revenueDeltaLabel}
        </p>
      </div>

      <MetricTint
        title="Pending Estimates"
        value={String(pendingEstimates)}
        subtext={`Value: ${compactFinanceMoney(pendingEstimateValue)}`}
        icon={<ClipboardList className="h-4 w-4" />}
        tint="bg-gradient-to-br from-sky-50 to-indigo-50"
        iconWrap="bg-sky-100 text-sky-600"
        valueClass="text-slate-900"
        subClass="text-slate-500"
      />

      <MetricTint
        title="Overdue Invoices"
        value={String(overdueInvoices)}
        subtext={`Total: ${compactFinanceMoney(overdueTotal)}`}
        icon={<Receipt className="h-4 w-4" />}
        tint="bg-gradient-to-br from-rose-50 to-orange-50"
        iconWrap="bg-rose-100 text-rose-600"
        valueClass="text-rose-600"
        subClass="text-rose-500"
        alert
      />

      <MetricTint
        title="Quote Conversion"
        value={`${quoteConversion}%`}
        subtext={quoteConversionLabel}
        icon={<TrendingUp className="h-4 w-4" />}
        tint="bg-gradient-to-br from-emerald-50 to-teal-50"
        iconWrap="bg-emerald-100 text-emerald-600"
        valueClass="text-slate-900"
        subClass="text-emerald-600"
      />
    </div>
  );
}

function MetricTint({
  title,
  value,
  subtext,
  icon,
  tint,
  iconWrap,
  valueClass,
  subClass,
  alert,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: ReactNode;
  tint: string;
  iconWrap: string;
  valueClass: string;
  subClass: string;
  alert?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/80 p-5 shadow-sm", tint)}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-50">
        <svg viewBox="0 0 320 56" className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M0 40 C50 36 70 22 120 24 C170 26 190 38 240 30 C280 24 300 18 320 22 L320 56 L0 56 Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="relative flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500">{title}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconWrap)}>
          {icon}
        </span>
      </div>
      <p className={cn("relative mt-3 text-[28px] font-bold tracking-tight", valueClass)}>
        {value}
      </p>
      <p className={cn("relative mt-1 text-[11px] font-medium", subClass)}>
        {alert ? "▲ " : ""}
        {subtext}
      </p>
    </div>
  );
}
