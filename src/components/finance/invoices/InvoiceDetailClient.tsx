"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Send,
  Trash2,
  Banknote,
  AlertTriangle,
} from "lucide-react";
import {
  appendInvoiceAudit,
  applyPaymentToInvoice,
  deleteInvoice,
  getInvoiceById,
  upsertInvoice,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance/invoices/types";
import {
  appendPaymentAudit,
  nextPaymentIds,
  upsertPayment,
} from "@/lib/finance/payments/types";
import {
  formatAUD,
  formatFinanceAt,
  formatFinanceDate,
} from "@/lib/finance/shared";
import { INVOICE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { cn } from "@/lib/utils";

export function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    setRow(getInvoiceById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: Invoice, msg?: string) {
    upsertInvoice(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function setStatus(status: InvoiceStatus, action: string) {
    if (!row || row.status === "Paid" || row.status === "Void") return;
    const next = appendInvoiceAudit({ ...row, status }, action);
    if (status === "Sent") next.sentAt = formatFinanceAt();
    save(next, action);
  }

  function recordPayment() {
    if (!row) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      flash("Enter a valid payment amount");
      return;
    }
    if (amount > row.amountDue) {
      flash("Amount exceeds balance due");
      return;
    }
    const ids = nextPaymentIds();
    upsertPayment(
      appendPaymentAudit(
        {
          id: ids.id,
          paymentId: ids.paymentId,
          invoiceId: row.id,
          invoiceRef: row.invoiceId,
          clientName: row.clientName,
          amount,
          method: "Bank transfer",
          status: "Completed",
          reference: `MANUAL-${Date.now().toString().slice(-6)}`,
          receivedAt: formatFinanceDate(),
          recordedBy: row.owner,
          createdAt: formatFinanceDate(),
          audit: [],
        },
        "Recorded",
        row.owner,
      ),
    );
    const paid = applyPaymentToInvoice(row, amount);
    save(
      appendInvoiceAudit(
        paid,
        `Payment recorded ${formatAUD(amount)}`,
        row.owner,
      ),
      `Payment ${formatAUD(amount)} recorded`,
    );
    setPayAmount("");
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Invoice not found
      </div>
    );
  }

  const terminal = row.status === "Paid" || row.status === "Void" || row.status === "Cancelled";

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

      <div className="relative mx-auto flex max-w-[1100px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/finance/invoices")}
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
              <Link href="/finance/invoices" className="hover:text-slate-600">
                Invoices
              </Link>
              <span>/</span>
            </nav>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.invoiceId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                INVOICE_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!terminal && row.status === "Draft" ? (
              <button
                type="button"
                onClick={() => setStatus("Sent", "Sent")}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            ) : null}
            {!terminal && row.status === "Sent" ? (
              <button
                type="button"
                onClick={() => setStatus("Overdue", "Marked overdue")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-800"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Mark overdue
              </button>
            ) : null}
            {row.quotationId ? (
              <Link
                href={`/finance/quotations/${row.quotationId}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                Source quote
              </Link>
            ) : null}
            <Link
              href="/finance/payments/create?layoutid=standard&redirect=false"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Banknote className="h-3.5 w-3.5" />
              Payments
            </Link>
            {!terminal ? (
              <button
                type="button"
                onClick={() => {
                  deleteInvoice(row.id);
                  router.push("/finance/invoices");
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{row.title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">
              {row.clientName} · {row.contactName} · {row.contactEmail}
              {row.quotationRef ? ` · From ${row.quotationRef}` : ""}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Total
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {formatAUD(row.total)}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50/70 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-emerald-600/80 uppercase">
                  Paid
                </div>
                <div className="text-[14px] font-bold text-emerald-800">
                  {formatAUD(row.amountPaid)}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50/70 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-amber-700/80 uppercase">
                  Due
                </div>
                <div className="text-[14px] font-bold text-amber-900">
                  {formatAUD(row.amountDue)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Due date
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {row.dueDate}
                </div>
              </div>
            </div>

            {!terminal && row.amountDue > 0 ? (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">
                    Record payment
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={String(row.amountDue)}
                    className="h-8 w-36 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={recordPayment}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Apply payment
                </button>
              </div>
            ) : null}
          </div>

          <div className="px-5 py-4">
            <LineItemsEditor items={row.lineItems} onChange={() => {}} readOnly />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              Audit
            </h3>
            <ul className="space-y-1.5">
              {row.audit.map((a) => (
                <li key={a.id} className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">{a.action}</span>
                  {" · "}
                  {a.actor} · {a.at}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
