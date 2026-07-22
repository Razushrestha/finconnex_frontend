"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Send,
  Check,
  X,
  Trash2,
  PenLine,
  Receipt,
} from "lucide-react";
import {
  appendQuotationAudit,
  deleteQuotation,
  getQuotationById,
  upsertQuotation,
  type Quotation,
  type QuotationStatus,
} from "@/lib/finance/quotations/types";
import {
  appendInvoiceAudit,
  nextInvoiceIds,
  upsertInvoice,
} from "@/lib/finance/invoices/types";
import {
  formatAUD,
  formatFinanceAt,
  formatFinanceDate,
} from "@/lib/finance/shared";
import { QUOTATION_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { cn } from "@/lib/utils";

export function QuotationDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Quotation | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRow(getQuotationById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: Quotation, msg?: string) {
    upsertQuotation(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function setStatus(status: QuotationStatus, action: string) {
    if (!row || row.status === "Invoiced") return;
    const next = appendQuotationAudit({ ...row, status }, action);
    if (status === "Sent") next.sentAt = formatFinanceAt();
    save(next, action);
  }

  function sendForSignature() {
    if (!row) return;
    save(
      appendQuotationAudit(
        { ...row, signatureStatus: "Pending", status: row.status === "Draft" ? "Sent" : row.status, sentAt: row.sentAt ?? formatFinanceAt() },
        "Contract sent for signature",
      ),
      "Contract sent (mock)",
    );
  }

  function markSigned() {
    if (!row) return;
    save(
      appendQuotationAudit(
        { ...row, signatureStatus: "Signed", status: "Accepted" },
        "Contract signed",
      ),
      "Marked signed",
    );
  }

  function convertToInvoice() {
    if (!row) return;
    if (row.status !== "Accepted" && row.signatureStatus !== "Signed") {
      flash("Accept / sign the quotation before invoicing");
      return;
    }
    if (row.invoiceId) {
      router.push(`/finance/invoices/${row.invoiceId}`);
      return;
    }
    const ids = nextInvoiceIds();
    const inv = upsertInvoice(
      appendInvoiceAudit(
        {
          id: ids.id,
          invoiceId: ids.invoiceId,
          title: row.title.replace(/quotation/i, "invoice") || `${row.title} invoice`,
          status: "Draft",
          clientId: row.clientId,
          clientName: row.clientName,
          contactName: row.contactName,
          contactEmail: row.contactEmail,
          dealName: row.dealName,
          owner: row.owner,
          issueDate: formatFinanceDate(),
          dueDate: row.validUntil,
          notes: row.notes,
          lineItems: row.lineItems.map((l) => ({ ...l, id: `ili-${l.id}` })),
          subtotal: 0,
          tax: 0,
          total: 0,
          amountPaid: 0,
          amountDue: 0,
          quotationId: row.id,
          quotationRef: row.quotationId,
          createdBy: row.owner,
          createdAt: formatFinanceDate(),
          audit: [],
        },
        "Created from quotation",
        row.owner,
      ),
    );
    save(
      appendQuotationAudit(
        { ...row, status: "Invoiced", invoiceId: inv.id },
        "Converted to invoice",
      ),
      "Converted to invoice",
    );
    router.push(`/finance/invoices/${inv.id}`);
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Quotation not found
      </div>
    );
  }

  const locked = row.status === "Invoiced";

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
              onClick={() => router.push("/finance/quotations")}
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
              <Link href="/finance/quotations" className="hover:text-slate-600">
                Quotations
              </Link>
              <span>/</span>
            </nav>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.quotationId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                QUOTATION_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
            {row.signatureStatus ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                E-Sign: {row.signatureStatus}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!locked && row.status === "Draft" ? (
              <button
                type="button"
                onClick={() => setStatus("Sent", "Sent")}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            ) : null}
            {!locked && row.signatureStatus !== "Signed" ? (
              <button
                type="button"
                onClick={sendForSignature}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                <PenLine className="h-3.5 w-3.5" />
                Send contract
              </button>
            ) : null}
            {!locked && row.signatureStatus === "Pending" ? (
              <button
                type="button"
                onClick={markSigned}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                Simulate sign
              </button>
            ) : null}
            {!locked && (row.status === "Sent" || row.status === "Draft") ? (
              <>
                <button
                  type="button"
                  onClick={() => setStatus("Accepted", "Accepted")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Rejected", "Rejected")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            ) : null}
            {!locked &&
            (row.status === "Accepted" || row.signatureStatus === "Signed") ? (
              <button
                type="button"
                onClick={convertToInvoice}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
              >
                <Receipt className="h-3.5 w-3.5" />
                Convert to invoice
              </button>
            ) : null}
            {row.invoiceId ? (
              <Link
                href={`/finance/invoices/${row.invoiceId}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                Open invoice
              </Link>
            ) : null}
            {row.estimateId ? (
              <Link
                href={`/finance/estimates/${row.estimateId}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                Source estimate
              </Link>
            ) : null}
            {!locked ? (
              <button
                type="button"
                onClick={() => {
                  deleteQuotation(row.id);
                  router.push("/finance/quotations");
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
              {row.estimateRef ? ` · From ${row.estimateRef}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span>
                Owner: <strong className="text-slate-700">{row.owner}</strong>
              </span>
              <span>
                Valid until:{" "}
                <strong className="text-slate-700">{row.validUntil}</strong>
              </span>
              <span>
                Total:{" "}
                <strong className="text-slate-900">{formatAUD(row.total)}</strong>
              </span>
            </div>
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
