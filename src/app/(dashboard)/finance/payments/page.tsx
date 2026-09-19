"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { listPayments, type Payment } from "@/lib/finance/payments/types";
import { useCrmPayments } from "@/lib/finance/payments/use-crm-payments";
import { onRecordsChange } from "@/lib/records-sync";
import { PaymentMetricsRow } from "@/components/finance/payments/PaymentMetricsRow";
import { SettlementMethodsVelocityCard } from "@/components/finance/payments/SettlementMethodsVelocityCard";
import { QuickPaymentActionsCard } from "@/components/finance/payments/QuickPaymentActionsCard";
import { PaymentsTable } from "@/components/finance/payments/PaymentsTable";
import { CreatePaymentForm } from "@/components/finance/payments/CreatePaymentForm";
import { cn } from "@/lib/utils";

export function PaymentsPage() {
  const router = useRouter();
  const crm = useCrmPayments();
  const [data, setData] = useState<Payment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    setPaymentInvoiceId(params.get("invoiceId") ?? undefined);
    setCreateOpen(true);
    router.replace("/finance/payments", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listPayments());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  return (
    <div className="min-h-full w-full bg-[#F4F7FB] p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Payments</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                crm.source === "api"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600",
              )}
            >
              {crm.source === "api" ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            Here&apos;s what&apos;s happening with your payments today.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5AE6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:bg-[#5B4BD4]"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      <PaymentMetricsRow data={data} />

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SettlementMethodsVelocityCard data={data} />
        </div>
        <QuickPaymentActionsCard
          live={crm.source === "api"}
          onRecordPayment={() => setCreateOpen(true)}
        />
      </div>

      <PaymentsTable data={data} />

      <CreatePaymentForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setData(listPayments())}
        initialInvoiceId={paymentInvoiceId}
      />
    </div>
  );
}

export default PaymentsPage;
