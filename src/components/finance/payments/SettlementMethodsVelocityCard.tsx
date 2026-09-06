"use client";

import React from "react";
import { Calendar, Building2, ArrowRight } from "lucide-react";

export const SettlementMethodsVelocityCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Settlement Methods & Velocity</h3>
            <p className="text-[11px] text-slate-400 font-normal">
              Realized transaction inflow by settlement channel across active billing contracts.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Fiscal Q3 2026</span>
          </div>
        </div>

        {/* Stacked Channel Velocity Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 my-4">
          <div className="h-full bg-purple-600 rounded-l-full w-[70%]" title="Bank Transfer / EFT (70%)" />
          <div className="h-full bg-blue-500 w-[20%]" title="Stripe Credit Card (20%)" />
          <div className="h-full bg-slate-300 rounded-r-full w-[10%]" title="Direct Debit (10%)" />
        </div>

        {/* Method Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
          {/* Channel 1 */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span className="text-[11px] font-bold text-slate-700">Bank Transfer / EFT</span>
            </div>
            <p className="text-lg font-bold text-slate-900 tracking-tight">$14,200.00</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">87.0% • 0 fee overhead</p>
          </div>

          {/* Channel 2 */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold text-slate-700">Stripe Credit Card</span>
            </div>
            <p className="text-lg font-bold text-slate-900 tracking-tight">$1,500.00</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">9.5% • Instant clearance</p>
          </div>

          {/* Channel 3 */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">Direct Debit</span>
            </div>
            <p className="text-lg font-bold text-slate-900 tracking-tight">$500.00</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">3.5% • Ezidebit gateway</p>
          </div>
        </div>
      </div>

      {/* Automated Payout Banner */}
      <div className="mt-4 p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-slate-900 font-semibold">
              Next Automated Payout: <strong className="font-bold text-purple-700">$2,915.00</strong>
            </p>
            <p className="text-[11px] text-slate-500">
              Scheduled for 29/07/2026 to Commonwealth Bank (...4019)
            </p>
          </div>
        </div>

        <button
          onClick={() => console.log("View Transfer Log")}
          className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
        >
          <span>View Transfer Log</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
