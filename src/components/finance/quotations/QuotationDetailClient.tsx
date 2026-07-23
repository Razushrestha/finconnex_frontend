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
  ExternalLink,
  Copy,
  FileSignature,
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
  publicSignPath,
  sendQuotationContract,
} from "@/lib/finance/quotations/signatureBridge";
import {
  appendInvoiceAudit,
  nextInvoiceIds,
  upsertInvoice,
} from "@/lib/finance/invoices/types";
import {
  ensureJourneyForQuote,
  getJourneyByQuotationId,
  touchJourneyStatus,
} from "@/lib/finance/journey/types";
import {
  formatAUD,
  formatFinanceAt,
  formatFinanceDate,
} from "@/lib/finance/shared";
import { QUOTATION_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function QuotationDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Quotation | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRow(getQuotationById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
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
    const { quotation, signUrl } = sendQuotationContract(row);
    setRow(quotation);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(
        `${window.location.origin}${signUrl}`,
      );
    }
    flash("Contract sent — sign link copied");
  }

  function copySignLink() {
    if (!row?.signatureToken) return;
    const url = `${window.location.origin}${publicSignPath(row.signatureToken)}`;
    void navigator.clipboard?.writeText(url);
    flash("Sign link copied");
  }

  function convertToInvoice() {
    if (!row) return;
    if (row.signatureStatus !== "Signed" && row.status !== "Accepted") {
      flash("Sign or accept the quotation before invoicing");
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
          title:
            row.title.replace(/quotation/i, "invoice") ||
            `${row.title} invoice`,
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
    const next = appendQuotationAudit(
      { ...row, status: "Invoiced", invoiceId: inv.id },
      "Converted to invoice",
    );
    upsertQuotation(next);
    ensureJourneyForQuote({
      quotationId: next.id,
      clientId: next.clientId,
      clientName: next.clientName,
      contactName: next.contactName,
      contactEmail: next.contactEmail,
      dealName: next.dealName,
      estimateId: next.estimateId,
      signatureRequestId: next.signatureRequestId,
      invoiceId: inv.id,
      status: "Invoiced",
    });
    touchJourneyStatus(next.id, "Invoiced", { invoiceId: inv.id });
    setRow(next);
    flash("Converted to invoice");
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
  const journey = getJourneyByQuotationId(row.id);
  const signHref = row.signatureToken
    ? publicSignPath(row.signatureToken)
    : null;

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
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/finance" className="hover:text-slate-600">
                Sales Ops
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
                {row.signatureStatus === "Pending"
                  ? "Resend contract"
                  : "Send for signature"}
              </button>
            ) : null}
            {signHref ? (
              <>
                <Link
                  href={signHref}
                  target="_blank"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open sign page
                </Link>
                <button
                  type="button"
                  onClick={copySignLink}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy sign link
                </button>
              </>
            ) : null}
            {row.signatureRequestId ? (
              <Link
                href={`/documents/signature/${row.signatureRequestId}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                <FileSignature className="h-3.5 w-3.5" />
                E-Sign record
              </Link>
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
                  if (!window.confirm(`Delete ${row.quotationId}?`)) return;
                  const gate = softDeleteRecord({
                    action: "finance.quotations.delete",
                    module: "finance.quotations",
                    recordId: row.id,
                    recordLabel: row.quotationId,
                    recordType: "Quotation",
                    snapshot: row,
                  });
                  if (!gate.ok) {
                    window.alert(gate.message);
                    return;
                  }
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

        <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] shadow-sm">
          <span className="font-semibold tracking-wide text-slate-400 uppercase">
            Journey
          </span>
          {row.estimateId ? (
            <Link
              href={`/finance/estimates/${row.estimateId}`}
              className="rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700"
            >
              Estimate
            </Link>
          ) : (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-400">
              Estimate
            </span>
          )}
          <span className="text-slate-300">→</span>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
            Quotation
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium",
              row.signatureStatus === "Signed"
                ? "bg-emerald-50 text-emerald-700"
                : row.signatureStatus === "Pending"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-50 text-slate-400",
            )}
          >
            E-Sign {row.signatureStatus ?? "—"}
          </span>
          <span className="text-slate-300">→</span>
          {row.invoiceId ? (
            <Link
              href={`/finance/invoices/${row.invoiceId}`}
              className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
            >
              Invoice
            </Link>
          ) : (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-400">
              Invoice
            </span>
          )}
          {journey ? (
            <span className="ml-auto text-[10px] text-slate-400">
              {journey.status} · /j/{journey.token}
            </span>
          ) : null}
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
              {signHref ? (
                <span className="text-violet-600">
                  Client sign:{" "}
                  <Link href={signHref} className="font-semibold underline">
                    {signHref}
                  </Link>
                </span>
              ) : null}
            </div>
          </div>
          <div className="px-5 py-4">
            <LineItemsEditor
              items={row.lineItems}
              onChange={() => {}}
              readOnly
            />
          </div>
          <div className="border-t border-slate-100 px-5 py-4">
            <RecordAuditHistory
              module="finance.quotations"
              recordId={row.id}
              localAudit={row.audit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
