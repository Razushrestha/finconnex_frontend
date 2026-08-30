"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Trash2,
  Banknote,
  AlertTriangle,
  Download,
  Link2,
  Paperclip,
} from "lucide-react";
import {
  addCrmInvoiceAttachment,
  createCrmInvoiceStripePayment,
  deleteCrmInvoice,
  deleteCrmInvoiceAttachment,
  downloadCrmInvoicePdf,
  getCrmInvoice,
  getCrmInvoicePublicLink,
  isCrmInvoiceId,
  listCrmInvoiceAttachments,
  persistRemoteInvoice,
  sendCrmInvoice,
  tryCrmInvoice,
  updateCrmInvoice,
} from "@/lib/finance/invoices/api";
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
import { CommercialTrail } from "@/components/finance/CommercialTrail";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [row, setRow] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRow(getInvoiceById(id) ?? null);
    setLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getCrmInvoice(id);
        if (cancelled || !remote) return;
        persistRemoteInvoice(remote);
        const attachments = await tryCrmInvoice(() =>
          listCrmInvoiceAttachments(id),
        );
        const next = attachments
          ? { ...remote, attachments }
          : { ...remote, attachments: remote.attachments ?? [] };
        persistRemoteInvoice(next);
        setRow(next);
      } catch {
        /* keep local overlay */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (isCrmInvoiceId(row.id) && status !== "Sent") {
      void tryCrmInvoice(() =>
        updateCrmInvoice(row.id, {
          status: status.toUpperCase().replace(/ /g, "_"),
        }),
      );
    }
  }

  async function onSend() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const remote = isCrmInvoiceId(row.id)
        ? await sendCrmInvoice(row.id)
        : null;
      const next = persistRemoteInvoice(remote) ?? {
        ...row,
        status: "Sent" as const,
        sentAt: formatFinanceAt(),
      };
      save(appendInvoiceAudit(next, "Sent"), "Invoice sent");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!row || busy || !isCrmInvoiceId(row.id)) return;
    setBusy(true);
    try {
      const blob = await downloadCrmInvoicePdf(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      flash("PDF downloaded");
    } catch (err) {
      flash(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublicLink() {
    if (!row || busy || !isCrmInvoiceId(row.id)) return;
    setBusy(true);
    try {
      const link = await getCrmInvoicePublicLink(row.id);
      if (!link?.url) {
        flash("No public link returned");
        return;
      }
      try {
        await navigator.clipboard.writeText(link.url);
      } catch {
        /* ignore */
      }
      save({ ...row, publicLink: link.url }, "Public link copied");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Public link failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAttach(file: File) {
    if (!row || busy || !isCrmInvoiceId(row.id)) return;
    setBusy(true);
    try {
      const added = await addCrmInvoiceAttachment(row.id, file);
      const attachments = added
        ? [...(row.attachments ?? []), added]
        : (await tryCrmInvoice(() => listCrmInvoiceAttachments(row.id))) ??
          row.attachments ??
          [];
      save({ ...row, attachments }, "Attachment uploaded");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveAttachment(attachmentId: string) {
    if (!row || busy) return;
    setBusy(true);
    try {
      if (isCrmInvoiceId(row.id)) {
        await deleteCrmInvoiceAttachment(row.id, attachmentId);
      }
      save(
        {
          ...row,
          attachments: (row.attachments ?? []).filter((a) => a.id !== attachmentId),
        },
        "Attachment removed",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function onStripe() {
    if (!row || busy || !isCrmInvoiceId(row.id)) return;
    setBusy(true);
    try {
      const result = await createCrmInvoiceStripePayment(row.id, {
        amount: row.amountDue,
      });
      if (result?.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        flash("Stripe checkout opened");
        return;
      }
      flash(
        result?.clientSecret
          ? "Stripe payment intent created"
          : "Stripe payment created",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Stripe payment failed");
    } finally {
      setBusy(false);
    }
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

  if (loading && !row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading invoice…
      </div>
    );
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
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col p-3 sm:p-4 lg:px-6 2xl:px-8">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/finance/invoices")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
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
                disabled={busy}
                onClick={() => void onSend()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            ) : null}
            {isCrmInvoiceId(row.id) ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onPdf()}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onPublicLink()}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Public link
                </button>
                {!terminal && row.amountDue > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onStripe()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 disabled:opacity-50"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Stripe
                  </button>
                ) : null}
              </>
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
                  if (!window.confirm(`Delete ${row.invoiceId}?`)) return;
                  const gate = softDeleteRecord({
                    action: "finance.invoices.delete",
                    module: "finance.invoices",
                    recordId: row.id,
                    recordLabel: row.invoiceId,
                    recordType: "Invoice",
                    snapshot: row,
                  });
                  if (!gate.ok) {
                    window.alert(gate.message);
                    return;
                  }
                  deleteInvoice(row.id);
                  if (isCrmInvoiceId(row.id)) {
                    void tryCrmInvoice(() => deleteCrmInvoice(row.id));
                  }
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

        <CommercialTrail
          links={[
            ...(row.quotationId
              ? [
                  {
                    label: row.quotationRef ?? "Quotation",
                    href: `/finance/quotations/${row.quotationId}`,
                  },
                ]
              : []),
            { label: row.invoiceId, current: true },
            {
              label: "Payments",
              href: "/finance/payments",
            },
          ]}
        />

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
            {row.publicLink ? (
              <a
                href={row.publicLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-[11px] text-violet-600"
              >
                {row.publicLink}
              </a>
            ) : null}

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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[12px] font-bold tracking-wide text-slate-700 uppercase">
                Attachments
              </h3>
              {isCrmInvoiceId(row.id) ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Add file
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onAttach(file);
                    }}
                  />
                </>
              ) : null}
            </div>
            {(row.attachments ?? []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No attachments</p>
            ) : (
              <ul className="space-y-1.5">
                {(row.attachments ?? []).map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[12px]"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      {att.name}
                      {att.sizeLabel ? (
                        <span className="ml-1 text-slate-400">{att.sizeLabel}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemoveAttachment(att.id)}
                      className="text-[11px] font-semibold text-rose-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <RecordAuditHistory
              module="finance.invoices"
              recordId={row.id}
              localAudit={row.audit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
