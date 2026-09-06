"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Send, RefreshCw, SlidersHorizontal, FileText, ChevronRight, Zap } from "lucide-react";

export const QuickPaymentActionsCard: React.FC = () => {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quick Payment Actions</h3>
            <p className="text-[11px] text-slate-400 font-normal">
              Streamlined workflows for handling settlements and client charges.
            </p>
          </div>
          <Zap className="w-4 h-4 text-purple-600" />
        </div>

        {/* Action List Items */}
        <div className="space-y-3">
          {/* Action 1 */}
          <div
            onClick={() => router.push("/finance/payments/create?layoutid=standard&redirect=false")}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Send Payment Link
                </h4>
                <p className="text-[11px] text-slate-500 font-normal">Generate SMS or email direct checkout</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>

          {/* Action 2 */}
          <div
            onClick={() => router.push("/finance/invoices")}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Batch Bank Reconciliation
                </h4>
                <p className="text-[11px] text-slate-500 font-normal">Match OFX bank feeds to open bills</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>

          {/* Action 3 */}
          <div
            onClick={() => router.push("/settings")}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                  Manage Gateways
                </h4>
                <p className="text-[11px] text-slate-500 font-normal">Stripe, Ezidebit, and BPAY settings</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Action 4 */}
          <div
            onClick={() => router.push("/finance/reports")}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Download Remittance Advice
                </h4>
                <p className="text-[11px] text-slate-500 font-normal">Generate consolidated statements</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* Stripe Status Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Stripe API Status: Connected</span>
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      </div>
    </div>
  );
};
