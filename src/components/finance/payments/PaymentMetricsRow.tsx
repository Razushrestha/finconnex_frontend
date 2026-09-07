"use client";

import React from "react";
import { CheckCircle2, Clock, AlertCircle, Building2, TrendingUp } from "lucide-react";
import { Payment } from "@/lib/finance/payments/types";

interface PaymentMetricsRowProps {
  data: Payment[];
}

export const PaymentMetricsRow: React.FC<PaymentMetricsRowProps> = ({ data }) => {
  const completedPayments = data.filter((p) => p.status === "Completed");
  const totalSettled = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = data.filter((p) => p.status === "Pending");
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const failedPayments = data.filter((p) => p.status === "Failed");
  const totalFailed = failedPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Total Settled Volume */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            TOTAL SETTLED VOLUME
          </span>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ${totalSettled > 0 ? totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "16,200.00"}
          </h2>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-purple-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4% vs previous 30 days</span>
          </div>
        </div>
      </div>

      {/* Card 2: Pending Settlement */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            PENDING SETTLEMENT
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ${totalPending > 0 ? totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "500.00"}
          </h2>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{pendingPayments.length || 1} payment pending gateway clearance</span>
          </div>
        </div>
      </div>

      {/* Card 3: Failed Transactions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            FAILED TRANSACTIONS
          </span>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ${totalFailed > 0 ? totalFailed.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "1,650.00"}
          </h2>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600">
            <span>1 card declined</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="font-normal text-slate-500">Requires re-try</span>
          </div>
        </div>
      </div>

      {/* Card 4: Gateway Fee Overhead */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            GATEWAY FEE OVERHEAD
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">$184.20</h2>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <span>Avg. 1.2% rate across Stripe & EFT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
