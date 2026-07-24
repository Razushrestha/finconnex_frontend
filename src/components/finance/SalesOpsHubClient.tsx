"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  Banknote,
  Package,
  Plus,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
import { listEstimates } from "@/lib/finance/estimates/types";
import { listQuotations } from "@/lib/finance/quotations/types";
import { listInvoices } from "@/lib/finance/invoices/types";
import { listPayments } from "@/lib/finance/payments/types";
import { listProducts } from "@/lib/finance/products/types";
import { formatAUD } from "@/lib/finance/shared";
import { cn } from "@/lib/utils";

type Tile = {
  key: string;
  href: string;
  createHref: string;
  label: string;
  section: string;
  icon: typeof FileText;
  headline: string;
  sub: string;
  cta: string;
};

export function SalesOpsHubClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [metrics, setMetrics] = useState({
    estimatesOpen: 0,
    estimatesDraft: 0,
    quotesOpen: 0,
    quotesTotal: 0,
    invoicesUnpaid: 0,
    invoicesOverdue: 0,
    unpaidAmount: 0,
    paymentsMonth: 0,
    paymentsPending: 0,
    productsActive: 0,
    productsTotal: 0,
  });
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const estimates = listEstimates();
    const quotes = listQuotations();
    const invoices = listInvoices();
    const payments = listPayments();
    const products = listProducts();

    const openEst = estimates.filter((e) =>
      ["Draft", "Sent", "Accepted"].includes(e.status),
    );
    const openQuotes = quotes.filter((q) =>
      ["Draft", "Sent", "Accepted"].includes(q.status),
    );
    const unpaidInv = invoices.filter(
      (i) =>
        i.amountDue > 0 &&
        !["Paid", "Cancelled", "Void"].includes(i.status),
    );
    const overdue = invoices.filter((i) => i.status === "Overdue");
    const completedPay = payments.filter((p) => p.status === "Completed");
    const pendingPay = payments.filter((p) => p.status === "Pending");

    setMetrics({
      estimatesOpen: openEst.length,
      estimatesDraft: estimates.filter((e) => e.status === "Draft").length,
      quotesOpen: openQuotes.length,
      quotesTotal: openQuotes.reduce((s, q) => s + q.total, 0),
      invoicesUnpaid: unpaidInv.length,
      invoicesOverdue: overdue.length,
      unpaidAmount: unpaidInv.reduce((s, i) => s + i.amountDue, 0),
      paymentsMonth: completedPay.reduce((s, p) => s + p.amount, 0),
      paymentsPending: pendingPay.length,
      productsActive: products.filter((p) => p.status === "Active").length,
      productsTotal: products.length,
    });
    setReady(true);
  }, []);

  const tiles: Tile[] = useMemo(
    () => [
      {
        key: "est",
        href: "/finance/estimates",
        createHref: "/finance/estimates/create?layoutid=standard&redirect=false",
        label: "Estimates",
        section: "§20.1",
        icon: FileText,
        headline: ready ? `${metrics.estimatesOpen} open` : "",
        sub: ready ? `${metrics.estimatesDraft} draft` : "Create & track",
        cta: "New estimate",
      },
      {
        key: "quo",
        href: "/finance/quotations",
        createHref: "/finance/quotations/create?layoutid=standard&redirect=false",
        label: "Quotations",
        section: "§20.2",
        icon: FileText,
        headline: ready ? `${metrics.quotesOpen} open` : "",
        sub: ready
          ? `${formatAUD(metrics.quotesTotal)} pipeline`
          : "Line items & pricing",
        cta: "New quotation",
      },
      {
        key: "inv",
        href: "/finance/invoices",
        createHref: "/finance/invoices/create?layoutid=standard&redirect=false",
        label: "Invoices",
        section: "§20.3",
        icon: Receipt,
        headline: ready ? `${metrics.invoicesUnpaid} unpaid` : "",
        sub: ready
          ? `${metrics.invoicesOverdue} overdue`
          : "Generate & send",
        cta: "New invoice",
      },
      {
        key: "pay",
        href: "/finance/payments",
        createHref: "/finance/payments/create?layoutid=standard&redirect=false",
        label: "Payments",
        section: "§20.4",
        icon: Banknote,
        headline: ready ? formatAUD(metrics.paymentsMonth) : "",
        sub: ready
          ? `${metrics.paymentsPending} pending`
          : "Record against invoices",
        cta: "Record payment",
      },
      {
        key: "cat",
        href: "/finance/products",
        createHref: "/finance/products/create?layoutid=standard&redirect=false",
        label: "Items / Services",
        section: "§20.5",
        icon: Package,
        headline: ready ? `${metrics.productsActive} active` : "",
        sub: ready
          ? `${metrics.productsTotal} in catalogue`
          : "Pricing catalogue",
        cta: "Add item",
      },
    ],
    [metrics, ready],
  );

  return (
    <FinanceOpsShell title="Sales operations" section="§20">
      <p className="mb-3 max-w-2xl text-[12px] leading-relaxed text-slate-500">
        Standalone estimates, quotations, invoices, payments, and catalogue 
        use each module on its own, or convert along the chain when you need to.
      </p>

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="flex flex-col rounded-2xl border border-slate-100/80 bg-white p-3.5 shadow-sm"
            >
              <button
                type="button"
                onClick={() => router.push(t.href)}
                className="flex flex-1 flex-col text-left"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <Icon className="h-3.5 w-3.5 text-violet-600" />
                    {t.label}
                  </span>
                  <span className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                    {t.section}
                  </span>
                </div>
                <div className="text-[18px] font-bold tracking-tight text-slate-900">
                  {t.headline}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{t.sub}</div>
              </button>
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-50 pt-2.5">
                <button
                  type="button"
                  onClick={() => router.push(t.createHref)}
                  className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600 text-[10px] font-semibold text-white hover:bg-violet-700"
                >
                  <Plus className="h-3 w-3" />
                  {t.cta}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(t.href)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label={`Open ${t.label}`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl border border-slate-100 bg-white px-4 py-3 text-[12px] shadow-sm">
        <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Snapshot
        </span>
        <span className="text-slate-600">
          Open quotes{" "}
          <strong className="text-slate-900">
            {ready ? formatAUD(metrics.quotesTotal) : ""}
          </strong>
        </span>
        <span className="text-slate-600">
          Unpaid invoices{" "}
          <strong className="text-slate-900">
            {ready ? formatAUD(metrics.unpaidAmount) : ""}
          </strong>
        </span>
        <span className="text-slate-600">
          Received{" "}
          <strong className="text-slate-900">
            {ready ? formatAUD(metrics.paymentsMonth) : ""}
          </strong>
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
            <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
            Revenue analytics
          </span>
          <span className="text-[10px] font-semibold text-violet-600">
            {showAnalytics ? "Hide" : "Show"}
          </span>
        </button>
        {showAnalytics ? (
          <div className="mt-3 space-y-2 border-t border-slate-50 pt-3 text-[12px] text-slate-600">
            <p>
              Full charts live under{" "}
              <Link
                href="/analytics"
                className="font-semibold text-violet-600 hover:underline"
              >
                Analytics
              </Link>{" "}
              and{" "}
              <Link
                href="/reports"
                className="font-semibold text-violet-600 hover:underline"
              >
                Reports
              </Link>
              . Sales Ops stays focused on documents and payments.
            </p>
            <p className={cn("text-[11px] text-slate-400")}>
              Optional client journey links still appear on quotation detail when
              a proposal-to-payment path exists: they are not required here.
            </p>
          </div>
        ) : null}
      </div>
    </FinanceOpsShell>
  );
}
