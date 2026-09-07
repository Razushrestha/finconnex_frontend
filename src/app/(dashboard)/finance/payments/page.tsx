"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { listPayments, type Payment } from "@/lib/finance/payments/types";
import { useCrmPayments } from "@/lib/finance/payments/use-crm-payments";
import { onRecordsChange } from "@/lib/records-sync";
import { PaymentMetricsRow } from "@/components/finance/payments/PaymentMetricsRow";
import { SettlementMethodsVelocityCard } from "@/components/finance/payments/SettlementMethodsVelocityCard";
import { QuickPaymentActionsCard } from "@/components/finance/payments/QuickPaymentActionsCard";
import { PaymentsTable } from "@/components/finance/payments/PaymentsTable";
import { cn } from "@/lib/utils";

export function PaymentsPage() {
  const router = useRouter();
  const crm = useCrmPayments();
  const [data, setData] = useState<Payment[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listPayments());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  // Export CSV Handler
  const exportCsv = () => {
    const header = [
      "Payment ID",
      "Invoice",
      "Client",
      "Amount",
      "Method",
      "Status",
      "Received At",
    ];
    const body = data.map((r) =>
      [
        r.paymentId,
        r.invoiceRef,
        r.clientName,
        `$${r.amount}`,
        r.method,
        r.status,
        r.receivedAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full w-full bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 text-slate-900 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Payments
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                crm.source === "api"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-slate-200/70 text-slate-600 border border-slate-300",
              )}
            >
              {crm.source === "api"
                ? "Live CRM"
                : crm.loading
                  ? "Connecting…"
                  : "Demo"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>
          <button
            onClick={() =>
              router.push(
                "/finance/payments/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#5249e0] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-purple-500/10 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record payment</span>
          </button>
        </div>
      </div>

      {/* Reusable Component 1: Top Metric Cards Row */}
      <PaymentMetricsRow data={data} />

      {/* Reusable Component 2 & 3: Settlement Velocity & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SettlementMethodsVelocityCard />
        </div>
        <div className="lg:col-span-1">
          <QuickPaymentActionsCard />
        </div>
      </div>

      {/* Reusable Component 4: Payments Table with Status Tabs & Filters */}
      <PaymentsTable data={data} />
    </div>
  );
}

export default PaymentsPage;
