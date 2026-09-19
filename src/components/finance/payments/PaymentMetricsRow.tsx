"use client";

import { CheckCircle2, Clock, AlertCircle, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { formatAUD, type Payment } from "@/lib/finance/payments/types";

function parseWhen(value?: string) {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function settledInWindow(data: Payment[], from: number, to: number) {
  return data
    .filter((p) => p.status === "Completed")
    .filter((p) => {
      const t = parseWhen(p.receivedAt || p.createdAt)?.getTime();
      return t != null && t >= from && t < to;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

export function PaymentMetricsRow({ data }: { data: Payment[] }) {
  const completed = data.filter((p) => p.status === "Completed");
  const totalSettled = completed.reduce((sum, p) => sum + p.amount, 0);
  const pending = data.filter((p) => p.status === "Pending");
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
  const failed = data.filter((p) => p.status === "Failed");
  const totalFailed = failed.reduce((sum, p) => sum + p.amount, 0);

  const now = Date.now();
  const day = 86_400_000;
  const current = settledInWindow(data, now - 30 * day, now);
  const previous = settledInWindow(data, now - 60 * day, now - 30 * day);
  const deltaPct =
    previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-violet-50/80 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Settled Volume</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-[26px] font-bold text-slate-900">{formatAUD(totalSettled)}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-violet-600">
          {deltaPct == null ? (
            <span className="font-medium text-slate-400">{completed.length} completed payments</span>
          ) : deltaPct >= 0 ? (
            <>
              <TrendingUp className="h-3.5 w-3.5" />
              +{deltaPct}% vs previous 30 days
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5" />
              {deltaPct}% vs previous 30 days
            </>
          )}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Settlement</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Clock className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-[26px] font-bold text-slate-900">{formatAUD(totalPending)}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {pending.length} payment{pending.length === 1 ? "" : "s"} pending clearance
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-rose-50/80 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Failed Transactions</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-[26px] font-bold text-slate-900">{formatAUD(totalFailed)}</p>
        <p className="mt-1 text-[11px] font-semibold text-rose-600">
          {failed.length} failed{failed.length ? " — requires re-try" : ""}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gateway Fee Overhead</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Landmark className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-[26px] font-bold text-slate-900">{formatAUD(0)}</p>
        <p className="mt-1 text-[11px] text-slate-400">Fee amounts are not stored on payments</p>
      </div>
    </div>
  );
}
