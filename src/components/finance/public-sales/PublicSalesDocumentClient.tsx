"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, X } from "lucide-react";
import {
  acceptPublicQuote,
  createPublicInvoicePayIntent,
  declinePublicQuote,
  formatAUD,
  getPublicEstimate,
  getPublicInvoice,
  getPublicQuote,
  type PublicSalesDocument,
  type PublicSalesKind,
} from "@/lib/finance/public-sales/api";
import { cn } from "@/lib/utils";

function loadDocument(kind: PublicSalesKind, id: string, hash: string) {
  if (kind === "quotes") return getPublicQuote(id, hash);
  if (kind === "estimates") return getPublicEstimate(id, hash);
  return getPublicInvoice(id, hash);
}

function kindLabel(kind: PublicSalesKind) {
  if (kind === "quotes") return "Quote";
  if (kind === "estimates") return "Estimate";
  return "Invoice";
}

export function PublicSalesDocumentClient({
  kind,
  id,
  hash,
}: {
  kind: PublicSalesKind;
  id: string;
  hash: string;
}) {
  const [doc, setDoc] = useState<PublicSalesDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadDocument(kind, id, hash)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError("This link is invalid or has expired.");
          return;
        }
        setDoc(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to open this document.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id, hash]);

  const status = (doc?.status ?? "").toLowerCase();
  const quoteOpen =
    kind === "quotes" &&
    !status.includes("accept") &&
    !status.includes("decline") &&
    !status.includes("reject") &&
    !status.includes("expir");
  const invoiceOpen =
    kind === "invoices" && (doc?.amountDue ?? 0) > 0 && !status.includes("paid");

  async function onAccept() {
    setBusy(true);
    setNote(null);
    try {
      const next = await acceptPublicQuote(id, hash);
      if (next) setDoc(next);
      setNote("Quote accepted. Thank you.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not accept this quote.");
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    setBusy(true);
    setNote(null);
    try {
      const next = await declinePublicQuote(id, hash);
      if (next) setDoc(next);
      setNote("Quote declined.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not decline this quote.");
    } finally {
      setBusy(false);
    }
  }

  async function onPay() {
    setBusy(true);
    setNote(null);
    try {
      const intent = await createPublicInvoicePayIntent(id, hash);
      if (intent.url) {
        window.location.href = intent.url;
        return;
      }
      setNote(
        intent.clientSecret
          ? "Payment session created. Complete checkout to finish paying."
          : "Payment session created.",
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Opening {kindLabel(kind).toLowerCase()}…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Link unavailable</p>
        <p className="mt-2 text-sm text-slate-500">
          {error ?? "This document could not be found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
            FinConnex · {kindLabel(kind)}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {doc.title || doc.number || kindLabel(kind)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {doc.number ? `${doc.number} · ` : ""}
            {doc.clientName}
            {doc.contactName ? ` · ${doc.contactName}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {doc.status}
        </span>
      </div>

      {note ? (
        <p className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {note}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2.5">Item</th>
              <th className="px-3 py-2.5 text-right">Qty</th>
              <th className="px-3 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((line) => (
              <tr key={line.id} className="border-t border-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{line.name}</div>
                  {line.description ? (
                    <div className="text-[12px] text-slate-500">{line.description}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-right text-slate-600">{line.quantity}</td>
                <td className="px-3 py-3 text-right text-slate-600">
                  {formatAUD(line.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatAUD(line.quantity * line.unitPrice)}
                </td>
              </tr>
            ))}
            {doc.lineItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No line items
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-slate-100 px-4 py-4 text-[13px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatAUD(doc.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>{formatAUD(doc.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatAUD(doc.total)}</span>
          </div>
          {kind === "invoices" ? (
            <div className="flex justify-between text-slate-600">
              <span>Amount due</span>
              <span>{formatAUD(doc.amountDue ?? 0)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-[12px] text-slate-600 sm:grid-cols-2">
        {doc.validUntil ? (
          <div>
            <dt className="font-semibold text-slate-400 uppercase">Valid until</dt>
            <dd>{doc.validUntil}</dd>
          </div>
        ) : null}
        {doc.dueDate ? (
          <div>
            <dt className="font-semibold text-slate-400 uppercase">Due</dt>
            <dd>{doc.dueDate}</dd>
          </div>
        ) : null}
        {doc.notes ? (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-slate-400 uppercase">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{doc.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {quoteOpen ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAccept()}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700",
                "disabled:opacity-50",
              )}
            >
              <Check className="h-4 w-4" />
              Accept quote
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDecline()}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50",
                "disabled:opacity-50",
              )}
            >
              <X className="h-4 w-4" />
              Decline
            </button>
          </>
        ) : null}
        {invoiceOpen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onPay()}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700",
              "disabled:opacity-50",
            )}
          >
            <CreditCard className="h-4 w-4" />
            Pay invoice
          </button>
        ) : null}
      </div>
    </div>
  );
}
