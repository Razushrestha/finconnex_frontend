"use client";

import { Calendar, Landmark, ChevronRight } from "lucide-react";
import { formatAUD, type Payment } from "@/lib/finance/payments/types";

function channelSum(data: Payment[], methods: Payment["method"][]) {
  return data
    .filter((p) => p.status === "Completed" && methods.includes(p.method))
    .reduce((sum, p) => sum + p.amount, 0);
}

export function SettlementMethodsVelocityCard({ data }: { data: Payment[] }) {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const bank = channelSum(data, ["Bank transfer"]);
  const card = channelSum(data, ["Stripe", "Card"]);
  const other = channelSum(data, ["PayPal", "Cash", "Other"]);
  const total = bank + card + other;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  const pending = data.filter((p) => p.status === "Pending");
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);
  const next = pending[0];

  const bankW = total > 0 ? (bank / total) * 100 : 0;
  const cardW = total > 0 ? (card / total) * 100 : 0;
  const otherW = total > 0 ? (other / total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">Settlement Methods & Velocity</h3>
          <p className="text-[11px] text-slate-400">
            Real-time transaction inflow by settlement channel across completed payments.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          <Calendar className="h-3 w-3 text-slate-400" />
          Fiscal Q{quarter} {now.getFullYear()}
        </span>
      </div>

      <div className="my-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-200" />
        ) : (
          <>
            <div className="h-full bg-violet-600" style={{ width: `${bankW}%` }} />
            <div className="h-full bg-blue-500" style={{ width: `${cardW}%` }} />
            <div className="h-full bg-emerald-400" style={{ width: `${otherW}%` }} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <p className="text-[11px] font-bold text-slate-600">Bank Transfer / EFT</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatAUD(bank)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{pct(bank)}% of settled volume</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <p className="text-[11px] font-bold text-slate-600">Card / Stripe</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatAUD(card)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{pct(card)}% of settled volume</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <p className="text-[11px] font-bold text-slate-600">Other methods</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatAUD(other)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{pct(other)}% PayPal, cash & other</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Landmark className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Next pending settlement:{" "}
              <span className="font-bold text-violet-700">{formatAUD(pendingTotal)}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {next
                ? `${next.paymentId} • ${next.clientName} • ${next.receivedAt || next.createdAt}`
                : "No payments awaiting clearance"}
            </p>
          </div>
        </div>
        <a
          href="/finance/payments"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline"
        >
          View transfer log
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
