"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getJourneyByToken,
  type FinanceJourney,
} from "@/lib/finance/journey/types";
import { getQuotationById } from "@/lib/finance/quotations/types";
import { getInvoiceById } from "@/lib/finance/invoices/types";
import { publicSignPath } from "@/lib/finance/quotations/signatureBridge";
import { formatAUD } from "@/lib/finance/shared";
import { listPortals } from "@/lib/portals/types";

function portalPathForClient(clientId: string, clientName: string) {
  const portals = listPortals();
  const match =
    portals.find((p) => p.clientId === clientId) ??
    portals.find((p) => p.clientName === clientName);
  return match ? `/p/${match.slug}/invoices` : null;
}

export function PublicJourneyClient({ token }: { token: string }) {
  const [journey, setJourney] = useState<FinanceJourney | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setJourney(getJourneyByToken(token) ?? null);
    setReady(true);
  }, [token]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Link not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This proposal link is invalid or has expired.
        </p>
      </div>
    );
  }

  const quote = journey.quotationId
    ? getQuotationById(journey.quotationId)
    : null;
  const invoice = journey.invoiceId
    ? getInvoiceById(journey.invoiceId)
    : null;
  const signHref = quote?.signatureToken
    ? publicSignPath(quote.signatureToken)
    : null;
  const payHref = portalPathForClient(journey.clientId, journey.clientName);

  return (
    <div className="relative min-h-dvh bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.14),_transparent_60%)]"
      />
      <div className="relative mx-auto max-w-lg px-4 py-10 sm:px-6">
        <p className="text-[11px] font-semibold tracking-widest text-violet-600 uppercase">
          FinConnex · Your proposal
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {journey.clientName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {journey.dealName ?? "Proposal to payment"} · {journey.contactName}
        </p>
        <p className="mt-3 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
          Status: {journey.status}
        </p>

        <div className="mt-8 space-y-3">
          {quote ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Quotation
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {quote.quotationId} · {quote.title}
              </div>
              <div className="mt-1 text-[13px] text-slate-600">
                {formatAUD(quote.total)} · E-Sign:{" "}
                {quote.signatureStatus ?? "Not sent"}
              </div>
              {signHref && quote.signatureStatus !== "Signed" ? (
                <Link
                  href={signHref}
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white"
                >
                  Review &amp; sign contract
                </Link>
              ) : null}
              {quote.signatureStatus === "Signed" ? (
                <p className="mt-3 text-[12px] font-medium text-emerald-700">
                  Contract signed: thank you.
                </p>
              ) : null}
            </div>
          ) : null}

          {invoice ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Invoice
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {invoice.invoiceId} · {invoice.title}
              </div>
              <div className="mt-1 text-[13px] text-slate-600">
                Due {formatAUD(invoice.amountDue)} of {formatAUD(invoice.total)}
              </div>
              {payHref ? (
                <Link
                  href={payHref}
                  className="mt-3 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700"
                >
                  Pay in client portal
                </Link>
              ) : null}
            </div>
          ) : quote?.signatureStatus === "Signed" ? (
            <p className="text-[12px] text-slate-500">
              Invoice will appear here once your broker issues it.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
