"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Check, X, Trash2 } from "lucide-react";
import {
  appendPaymentAudit,
  deletePayment,
  getPaymentById,
  upsertPayment,
  type Payment,
} from "@/lib/finance/payments/types";
import {
  applyPaymentToInvoice,
  appendInvoiceAudit,
  getInvoiceById,
  upsertInvoice,
} from "@/lib/finance/invoices/types";
import { formatAUD } from "@/lib/finance/shared";
import { PAYMENT_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { CommercialTrail } from "@/components/finance/CommercialTrail";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function PaymentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Payment | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRow(getPaymentById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: Payment, msg?: string) {
    upsertPayment(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function complete() {
    if (!row || row.status === "Completed") return;
    const inv = getInvoiceById(row.invoiceId);
    if (inv) {
      const paid = applyPaymentToInvoice(inv, row.amount);
      upsertInvoice(
        appendInvoiceAudit(
          paid,
          `Payment completed ${formatAUD(row.amount)}`,
          row.recordedBy,
        ),
      );
    }
    save(
      appendPaymentAudit({ ...row, status: "Completed" }, "Marked completed"),
      "Completed",
    );
  }

  function fail() {
    if (!row) return;
    save(appendPaymentAudit({ ...row, status: "Failed" }, "Marked failed"), "Failed");
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Payment not found
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[900px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/finance/payments")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/finance" className="hover:text-slate-600">
                Sales Ops
              </Link>
              <span>/</span>
              <Link href="/finance/payments" className="hover:text-slate-600">
                Payments
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              {row.paymentId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                PAYMENT_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {row.status === "Pending" ? (
              <>
                <button
                  type="button"
                  onClick={complete}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Complete
                </button>
                <button
                  type="button"
                  onClick={fail}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Fail
                </button>
              </>
            ) : null}
            <Link
              href={`/finance/invoices/${row.invoiceId}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              Open invoice
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Delete ${row.paymentId}?`)) return;
                const gate = softDeleteRecord({
                  action: "finance.payments.delete",
                  module: "finance.payments",
                  recordId: row.id,
                  recordLabel: row.paymentId,
                  recordType: "Payment",
                  snapshot: row,
                });
                if (!gate.ok) {
                  window.alert(gate.message);
                  return;
                }
                deletePayment(row.id);
                router.push("/finance/payments");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <CommercialTrail
          links={[
            {
              label: row.invoiceRef,
              href: `/finance/invoices/${row.invoiceId}`,
            },
            { label: row.paymentId, current: true },
          ]}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Amount
              </div>
              <div className="text-[22px] font-bold text-slate-900">
                {formatAUD(row.amount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Client
              </div>
              <div className="text-[14px] font-semibold text-slate-800">
                {row.clientName}
              </div>
            </div>
            <div className="text-[12px] text-slate-600">
              Invoice:{" "}
              <strong className="text-slate-800">{row.invoiceRef}</strong>
            </div>
            <div className="text-[12px] text-slate-600">
              Method: <strong className="text-slate-800">{row.method}</strong>
            </div>
            <div className="text-[12px] text-slate-600">
              Received:{" "}
              <strong className="text-slate-800">{row.receivedAt}</strong>
            </div>
            <div className="text-[12px] text-slate-600">
              Reference:{" "}
              <strong className="text-slate-800">{row.reference ?? "—"}</strong>
            </div>
            {row.notes ? (
              <p className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                {row.notes}
              </p>
            ) : null}
          </div>
          <div className="border-t border-slate-100 px-5 py-4">
            <RecordAuditHistory
              module="finance.payments"
              recordId={row.id}
              localAudit={row.audit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
