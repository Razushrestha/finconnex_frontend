"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  CreditCard,
  Mail,
  Zap,
} from "lucide-react";
import {
  listInvoices,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance/invoices/types";
import { useCrmInvoices } from "@/lib/finance/invoices/use-crm-invoices";
import { listPayments } from "@/lib/finance/payments/types";
import { formatAUD } from "@/lib/finance/shared";
import { onRecordsChange } from "@/lib/records-sync";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CreateInvoiceForm } from "@/components/finance/invoices/CreateInvoiceForm";
import { CreatePaymentForm } from "@/components/finance/payments/CreatePaymentForm";
import type { RelatedFinancePrefill } from "@/lib/finance/related-prefill";

function parseWhen(value?: string) {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function relativeTime(value?: string) {
  const d = parseWhen(value);
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function daysFromDue(dueDate: string) {
  const d = parseWhen(dueDate);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function dueSubtext(item: Invoice) {
  if (item.status === "Paid") {
    return { text: "Settled in full", className: "text-emerald-600" };
  }
  const n = daysFromDue(item.dueDate);
  if (n == null) return null;
  if (n < 0) {
    const overdue = Math.abs(n);
    return {
      text: `Overdue ${overdue} day${overdue === 1 ? "" : "s"}`,
      className: "text-rose-600",
    };
  }
  if (n === 0) return { text: "Due today", className: "text-amber-600" };
  return {
    text: `Due in ${n} day${n === 1 ? "" : "s"}`,
    className: "text-slate-500",
  };
}

function statusBadge(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
      return "bg-emerald-100 text-emerald-700";
    case "Partially Paid":
      return "bg-amber-100 text-amber-700";
    case "Sent":
      return "bg-blue-100 text-blue-700";
    case "Draft":
      return "bg-slate-100 text-slate-600";
    case "Overdue":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function agingBucket(dueDate: string, mode: "days" | "months") {
  const d = parseWhen(dueDate);
  if (!d) return 0;
  const daysPast = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const age = Math.max(0, daysPast);
  if (mode === "months") {
    const months = age / 30;
    if (months <= 1) return 0;
    if (months <= 2) return 1;
    if (months <= 3) return 2;
    return 3;
  }
  if (age <= 30) return 0;
  if (age <= 60) return 1;
  if (age <= 90) return 2;
  return 3;
}

export function InvoicesPage() {
  const router = useRouter();
  const crm = useCrmInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [agingMode, setAgingMode] = useState<"days" | "months">("days");
  const [data, setData] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState(listPayments());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<RelatedFinancePrefill>({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    setCreatePrefill({
      relatedKind: params.get("relatedKind") ?? undefined,
      relatedName: params.get("relatedName") ?? undefined,
      relatedId: params.get("relatedId") ?? undefined,
      email: params.get("to") ?? undefined,
    });
    setCreateOpen(true);
    router.replace("/finance/invoices", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => {
      setData(listInvoices());
      setPayments(listPayments());
    };
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  const filteredData = useMemo(() => {
    const days =
      dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : dateFilter === "90d" ? 90 : null;
    const cutoff = days ? Date.now() - days * 86_400_000 : null;

    return data.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.invoiceId.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        String(item.amountDue).includes(q);
      const matchesStatus =
        statusFilter === "All" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchesSearch || !matchesStatus) return false;
      if (!cutoff) return true;
      const created = parseWhen(item.createdAt)?.getTime();
      return created == null || created >= cutoff;
    });
  }, [data, search, statusFilter, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const unpaidItems = data.filter(
    (e) => e.status !== "Paid" && e.status !== "Void" && e.status !== "Cancelled",
  );
  const totalOutstanding = unpaidItems.reduce((acc, curr) => acc + curr.amountDue, 0);
  const paidItems = data.filter((e) => e.status === "Paid");
  const totalPaid = paidItems.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const overdueItems = data.filter((e) => e.status === "Overdue");
  const totalCount = data.length;

  const paidVal = data
    .filter((e) => e.status === "Paid")
    .reduce((acc, c) => acc + c.amountPaid, 0);
  const partialVal = data
    .filter((e) => e.status === "Partially Paid")
    .reduce((acc, c) => acc + c.total, 0);
  const draftVal = data.filter((e) => e.status === "Draft").reduce((acc, c) => acc + c.total, 0);
  const overdueVal = overdueItems.reduce((acc, c) => acc + c.amountDue, 0);
  const totalVolume = paidVal + partialVal + draftVal + overdueVal;

  const ring = [
    { label: "Paid", value: paidVal, color: "#7C3AED" },
    { label: "Partial", value: partialVal, color: "#3B82F6" },
    { label: "Draft", value: draftVal, color: "#F59E0B" },
    { label: "Overdue", value: overdueVal, color: "#EF4444" },
  ];

  const openReceivables = data.filter(
    (e) => e.amountDue > 0 && e.status !== "Paid" && e.status !== "Void" && e.status !== "Cancelled",
  );
  const agingTotals = [0, 0, 0, 0];
  for (const inv of openReceivables) {
    agingTotals[agingBucket(inv.dueDate, agingMode)] += inv.amountDue;
  }
  const agingSum = agingTotals.reduce((a, b) => a + b, 0);
  const agingLabels =
    agingMode === "days"
      ? ["Current (1–30 Days)", "31 – 60 Days", "61 – 90 Days", "90+ Days (Overdue Alert)"]
      : ["Current (0–1 Month)", "1 – 2 Months", "2 – 3 Months", "3+ Months (Overdue Alert)"];
  const agingColors = ["bg-violet-500", "bg-blue-500", "bg-amber-500", "bg-rose-500"];

  const nextDue = [...openReceivables]
    .map((inv) => ({ inv, at: parseWhen(inv.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.at - b.at)[0];

  const activity = useMemo(() => {
    const events: {
      id: string;
      title: ReactNode;
      sub: string;
      tone: "ok" | "pay" | "warn";
      at: number;
    }[] = [];

    for (const pay of payments.filter((p) => p.status === "Completed")) {
      events.push({
        id: `pay-${pay.id}`,
        title: (
          <>
            Payment received for <span className="font-semibold">{pay.invoiceRef}</span> (
            {formatAUD(pay.amount)} settled via {pay.method})
          </>
        ),
        sub: `${pay.clientName} • ${relativeTime(pay.receivedAt || pay.createdAt)}`,
        tone: "ok",
        at: parseWhen(pay.receivedAt || pay.createdAt)?.getTime() ?? 0,
      });
    }

    for (const inv of data) {
      const created = parseWhen(inv.createdAt)?.getTime() ?? 0;
      if (inv.status === "Partially Paid") {
        events.push({
          id: `${inv.id}-partial`,
          title: (
            <>
              Partial payment recorded on <span className="font-semibold">{inv.invoiceId}</span>{" "}
              ({formatAUD(inv.amountPaid)} of {formatAUD(inv.total)})
            </>
          ),
          sub: `${inv.clientName} • ${relativeTime(inv.createdAt)}`,
          tone: "pay",
          at: created,
        });
      }
      if (inv.status === "Overdue") {
        events.push({
          id: `${inv.id}-overdue`,
          title: (
            <>
              Overdue balance on <span className="font-semibold">{inv.invoiceId}</span> (
              {formatAUD(inv.amountDue)})
            </>
          ),
          sub: `${inv.clientName} • ${relativeTime(inv.dueDate)}`,
          tone: "warn",
          at: parseWhen(inv.dueDate)?.getTime() ?? created,
        });
      }
    }

    return events.sort((a, b) => b.at - a.at).slice(0, 3);
  }, [data, payments]);

  const circ = 2 * Math.PI * 38;

  function exportCsv() {
    const header = ["Invoice ID", "Client", "Due Date", "Status", "Paid", "Balance"];
    const body = filteredData.map((r) =>
      [r.invoiceId, r.clientName, r.dueDate, r.status, formatAUD(r.amountPaid), formatAUD(r.amountDue)]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full w-full bg-[#F4F7FB] p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Sales Invoices</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                crm.source === "api"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600",
              )}
            >
              {crm.source === "api" ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            Track, manage and get paid for your invoices all in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export CSV / PDF
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5AE6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:bg-[#5B4BD4]"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B4BDB] via-[#6E5AE8] to-[#8B6CF6] p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-30">
            <svg viewBox="0 0 320 56" className="h-full w-full" preserveAspectRatio="none">
              <path d="M0 40 C40 36 60 18 110 22 C160 26 180 38 230 28 C270 20 300 16 320 20 L320 56 L0 56 Z" fill="white" />
            </svg>
          </div>
          <div className="relative flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Outstanding Balance</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="relative mt-3 text-[26px] font-bold tracking-tight">{formatAUD(totalOutstanding)}</p>
          <p className="relative mt-1 text-[11px] text-white/80">Total unpaid receivable</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid Invoices</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[26px] font-bold text-slate-900">{formatAUD(totalPaid)}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {paidItems.length} Successfully settled
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[26px] font-bold text-slate-900">{totalCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Tracked in system</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-rose-50/80 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overdue Invoices</p>
              <p className="mt-3 text-[26px] font-bold text-slate-900">{overdueItems.length}</p>
              <p className="mt-1 text-[11px] font-semibold text-rose-600">Requires immediate attention</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">Collections Overview</h3>
              <p className="text-[11px] text-slate-400">Realtime revenue settlement</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              Active
            </span>
          </div>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#EEF2FF" strokeWidth="14" fill="transparent" />
                {(() => {
                  let offset = 0;
                  return ring.map((seg) => {
                    const pct = totalVolume > 0 ? seg.value / totalVolume : 0;
                    const dash = pct * circ;
                    const el = (
                      <circle
                        key={seg.label}
                        cx="50"
                        cy="50"
                        r="38"
                        stroke={seg.color}
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={-offset}
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400">Total Volume</span>
                <span className="text-[15px] font-bold text-slate-900">{formatAUD(totalVolume)}</span>
              </div>
            </div>
            <div className="w-full flex-1 space-y-2 text-xs">
              {ring.map((seg) => {
                const pct = totalVolume > 0 ? Math.round((seg.value / totalVolume) * 100) : 0;
                return (
                  <div key={seg.label} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatAUD(seg.value)} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">Receivables Aging Analysis</h3>
              <p className="text-[11px] text-slate-400">Uncollected amounts by overdue maturity</p>
            </div>
            <div className="flex rounded-full bg-slate-100 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAgingMode("days")}
                className={cn(
                  "rounded-full px-2.5 py-1",
                  agingMode === "days" ? "bg-[#6D5AE6] text-white" : "text-slate-500",
                )}
              >
                Days
              </button>
              <button
                type="button"
                onClick={() => setAgingMode("months")}
                className={cn(
                  "rounded-full px-2.5 py-1",
                  agingMode === "months" ? "bg-[#6D5AE6] text-white" : "text-slate-500",
                )}
              >
                Months
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {agingLabels.map((label, i) => {
              const value = agingTotals[i];
              const pct = agingSum > 0 ? Math.round((value / agingSum) * 100) : 0;
              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className={cn("font-semibold", i === 3 ? "text-rose-600" : "text-slate-500")}>
                      {label}
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatAUD(value)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn("h-full rounded-full", agingColors[i])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            Next expected payout:{" "}
            <span className="font-semibold text-slate-700">
              {nextDue
                ? `${formatAUD(nextDue.inv.amountDue)} on ${nextDue.inv.dueDate || "—"}`
                : "None scheduled"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-[14px] font-bold text-slate-900">Quick Operations</h3>
          <p className="mb-4 text-[11px] text-slate-400">Common billing workflows</p>
          <div className="space-y-2.5">
            <ActionRow
              icon={Plus}
              iconClass="bg-violet-100 text-violet-600"
              title="New Sales Invoice"
              hint="Blank or from quote"
              onClick={() => setCreateOpen(true)}
            />
            <ActionRow
              icon={CreditCard}
              iconClass="bg-sky-100 text-sky-600"
              title="Record Payment"
              hint="Manual offline receipt"
              onClick={() => {
                setPaymentInvoiceId(undefined);
                setPaymentOpen(true);
              }}
            />
            <ActionRow
              icon={Mail}
              iconClass="bg-orange-100 text-orange-600"
              title="Send Reminder"
              hint="Email overdue batch"
              onClick={() => setStatusFilter("Overdue")}
            />
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="w-full rounded-xl bg-[#6D5AE6] px-3 py-2.5 text-center text-xs font-bold text-white hover:bg-[#5B4BD4]"
            >
              Open Invoicing Reports
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices by number, client name, or amount..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-3 text-xs font-semibold text-slate-700"
                >
                  <option value="All">Status: All</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Partially Paid">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </label>
              <label className="relative">
                <Calendar className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-9 text-xs font-semibold text-slate-700"
                >
                  <option value="30d">Last 30 Days</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </label>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-5 py-3">#</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => {
                    const due = dueSubtext(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/finance/invoices/${item.id}`)}
                        className="cursor-pointer hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 text-slate-400">
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-4 font-semibold whitespace-nowrap text-violet-600">
                          {item.invoiceId}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                              {initials(item.clientName || "?")}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                              <p className="text-xs text-slate-400">{item.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="block text-sm text-slate-600">{item.dueDate || "—"}</span>
                          {due ? (
                            <span className={cn("mt-0.5 block text-[11px] font-medium", due.className)}>
                              {due.text}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusBadge(item.status))}>
                            {item.status === "Partially Paid" ? "Partial" : item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold whitespace-nowrap text-slate-900">
                          {formatAUD(item.amountPaid)}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold whitespace-nowrap text-slate-900">
                          {formatAUD(item.amountDue)}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => router.push(`/finance/invoices/${item.id}`)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuId(activeMenuId === item.id ? null : item.id)
                                }
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {activeMenuId === item.id ? (
                                <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 text-left text-xs text-slate-700 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      router.push(`/finance/invoices/${item.id}`);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setPaymentInvoiceId(item.id);
                                      setPaymentOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Record Payment
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            entriesLabel="invoices"
          />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-slate-900">
              <Zap className="h-4 w-4 text-violet-500" />
              Recent Invoicing Events
            </h3>
            <button
              type="button"
              onClick={() => setDateFilter("all")}
              className="text-[11px] font-semibold text-violet-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-4">
            {activity.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-slate-400">No recent invoicing events.</p>
            ) : (
              activity.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      event.tone === "ok"
                        ? "bg-emerald-50 text-emerald-600"
                        : event.tone === "pay"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-rose-50 text-rose-600",
                    )}
                  >
                    {event.tone === "ok" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : event.tone === "pay" ? (
                      <DollarSign className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-[12px] text-slate-700">{event.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{event.sub}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateInvoiceForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setData(listInvoices())}
        relatedKind={createPrefill.relatedKind}
        relatedName={createPrefill.relatedName}
        relatedId={createPrefill.relatedId}
        email={createPrefill.email}
      />
      <CreatePaymentForm
        variant="modal"
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onCreated={() => {
          setData(listInvoices());
          setPayments(listPayments());
        }}
        initialInvoiceId={paymentInvoiceId}
      />
    </div>
  );
}

function ActionRow({
  icon: Icon,
  iconClass,
  title,
  hint,
  onClick,
}: {
  icon: typeof Plus;
  iconClass: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/40"
    >
      <span className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-xs font-bold text-slate-900">{title}</span>
          <span className="block text-[11px] text-slate-400">{hint}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}

export default InvoicesPage;
