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
import { FINANCE_PRIMARY_BUTTON } from "@/components/finance/buttonStyles";

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
    <div className="min-h-full w-full bg-white p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={FINANCE_PRIMARY_BUTTON}
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
