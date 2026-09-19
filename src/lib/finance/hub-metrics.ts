import { listCreditNotes } from "@/lib/finance/credit-notes/types";
import { listEstimates } from "@/lib/finance/estimates/types";
import { listInvoices } from "@/lib/finance/invoices/types";
import { listPayments } from "@/lib/finance/payments/types";
import { listQuotations } from "@/lib/finance/quotations/types";
import { mockData, type FinancialDataPoint } from "@/lib/hub/types";

export type HubActivityTone = "payment" | "approved" | "overdue" | "sent";

export type HubActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  badge: string;
  tone: HubActivityTone;
  href: string;
};

export type FinanceHubSnapshot = {
  totalRevenue: number;
  revenueDeltaLabel: string;
  pendingEstimates: number;
  pendingEstimateValue: number;
  overdueInvoices: number;
  overdueTotal: number;
  quoteConversion: number;
  quoteConversionLabel: string;
  chart: FinancialDataPoint[];
  activity: HubActivityItem[];
};

function compactMoney(n: number) {
  if (!Number.isFinite(n) || n === 0) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1_000)}k`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relativeTime(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function lastSixMonthLabels() {
  const now = new Date();
  const labels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push({
      key: monthKey(d),
      label: d.toLocaleString("en-AU", { month: "short" }),
    });
  }
  return labels;
}

export function compactFinanceMoney(n: number) {
  return compactMoney(n);
}

export function loadFinanceHubSnapshot(): FinanceHubSnapshot {
  const invoices = listInvoices();
  const estimates = listEstimates();
  const quotes = listQuotations();
  const payments = listPayments();
  const credits = listCreditNotes();

  const paid = invoices.filter((i) => i.status === "Paid");
  const completedPay = payments.filter((p) => p.status === "Completed");
  const totalRevenue =
    completedPay.reduce((s, p) => s + p.amount, 0) ||
    paid.reduce((s, i) => s + i.amountPaid, 0);

  const pendingEstimates = estimates.filter((e) =>
    ["Draft", "Sent"].includes(e.status),
  );
  const overdue = invoices.filter((i) => i.status === "Overdue");

  const decidedQuotes = quotes.filter((q) =>
    ["Accepted", "Rejected", "Expired", "Invoiced"].includes(q.status),
  );
  const wonQuotes = quotes.filter((q) =>
    ["Accepted", "Invoiced"].includes(q.status),
  );
  const quoteConversion =
    decidedQuotes.length > 0
      ? Math.round((wonQuotes.length / decidedQuotes.length) * 100)
      : quotes.length > 0
        ? Math.round((wonQuotes.length / quotes.length) * 100)
        : 0;

  const months = lastSixMonthLabels();
  const revenueByMonth = new Map(months.map((m) => [m.key, 0]));
  const expenseByMonth = new Map(months.map((m) => [m.key, 0]));

  for (const pay of completedPay) {
    const d = parseDate(pay.receivedAt) ?? parseDate(pay.createdAt);
    if (!d) continue;
    const key = monthKey(d);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + pay.amount);
    }
  }
  for (const note of credits) {
    if (["Void", "Cancelled"].includes(note.status)) continue;
    const d = parseDate(note.createdAt);
    if (!d) continue;
    const key = monthKey(d);
    if (expenseByMonth.has(key)) {
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + note.total);
    }
  }

  const liveChart = months.map((m) => ({
    label: m.label,
    revenue: revenueByMonth.get(m.key) ?? 0,
    expenses: expenseByMonth.get(m.key) ?? 0,
  }));
  const hasChartData = liveChart.some((p) => p.revenue > 0 || p.expenses > 0);

  const activity: HubActivityItem[] = [
    ...completedPay.map((p) => ({
      id: p.id,
      title: `Payment received for Invoice ${p.invoiceRef}`,
      subtitle: `${p.clientName} • ${compactMoney(p.amount)}`,
      time: relativeTime(p.receivedAt || p.createdAt),
      badge: "Payment",
      tone: "payment" as const,
      href: `/finance/payments/${p.id}`,
      at: parseDate(p.receivedAt || p.createdAt)?.getTime() ?? 0,
    })),
    ...quotes
      .filter((q) => q.status === "Accepted")
      .map((q) => ({
        id: q.id,
        title: "Quote approved by client",
        subtitle: `${q.clientName} • ${q.quotationId}`,
        time: relativeTime(q.createdAt),
        badge: "Approved",
        tone: "approved" as const,
        href: `/finance/quotations/${q.id}`,
        at: parseDate(q.createdAt)?.getTime() ?? 0,
      })),
    ...overdue.map((i) => ({
      id: i.id,
      title: "Invoice overdue",
      subtitle: `${i.clientName} • ${i.invoiceId}`,
      time: relativeTime(i.dueDate),
      badge: "Overdue",
      tone: "overdue" as const,
      href: `/finance/invoices/${i.id}`,
      at: parseDate(i.dueDate)?.getTime() ?? 0,
    })),
    ...quotes
      .filter((q) => q.status === "Sent")
      .map((q) => ({
        id: `${q.id}-sent`,
        title: "Quote sent to prospect",
        subtitle: `${q.clientName} • ${q.quotationId}`,
        time: relativeTime(q.sentAt || q.createdAt),
        badge: "Sent",
        tone: "sent" as const,
        href: `/finance/quotations/${q.id}`,
        at: parseDate(q.sentAt || q.createdAt)?.getTime() ?? 0,
      })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 4)
    .map(({ at: _at, ...rest }) => rest);

  return {
    totalRevenue,
    revenueDeltaLabel: "Year to date receipts",
    pendingEstimates: pendingEstimates.length,
    pendingEstimateValue: pendingEstimates.reduce((s, e) => s + e.total, 0),
    overdueInvoices: overdue.length,
    overdueTotal: overdue.reduce((s, i) => s + i.amountDue, 0),
    quoteConversion,
    quoteConversionLabel:
      decidedQuotes.length > 0
        ? `${wonQuotes.length} of ${decidedQuotes.length} decided`
        : "Accepted vs decided quotes",
    chart: hasChartData ? liveChart : mockData["6m"],
    activity,
  };
}
