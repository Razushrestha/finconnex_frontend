"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  CreditCard,
  Mail,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  listInvoices,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance/invoices/types";
import { useCrmInvoices } from "@/lib/finance/invoices/use-crm-invoices";
import { onRecordsChange } from "@/lib/records-sync";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

export function InvoicesPage() {
  const router = useRouter();
  const crm = useCrmInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [agingMode, setAgingMode] = useState<"days" | "months">("days");
  const [data, setData] = useState<Invoice[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listInvoices());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  // Filter logic
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.amountDue.toString().includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  // Calculate Metrics dynamically
  const unpaidItems = data.filter(
    (e) =>
      e.status !== "Paid" && e.status !== "Void" && e.status !== "Cancelled",
  );
  const totalOutstanding = unpaidItems.reduce(
    (acc, curr) => acc + curr.amountDue,
    0,
  );

  const paidItems = data.filter((e) => e.status === "Paid");
  const totalPaid = paidItems.reduce((acc, curr) => acc + curr.amountPaid, 0);

  const overdueItems = data.filter((e) => e.status === "Overdue");
  const totalOverdue = overdueItems.reduce(
    (acc, curr) => acc + curr.amountDue,
    0,
  );

  const totalCount = data.length;

  // Helper for status badge styling
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "Partially Paid":
        return "bg-purple-100/80 text-purple-700 border border-purple-200/60";
      case "Sent":
        return "bg-blue-100/80 text-blue-700 border border-blue-200/60";
      case "Draft":
        return "bg-slate-100 text-slate-700 border border-slate-200/60";
      case "Overdue":
        return "bg-rose-100/80 text-rose-700 border border-rose-200/60";
      case "Paid":
        return "bg-emerald-100/80 text-emerald-700 border border-emerald-200/60";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Helper for Due Date Subtext
  const getDueDateSubtext = (item: Invoice) => {
    if (item.status === "Paid") {
      return (
        <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">
          Settled in full
        </span>
      );
    }
    if (item.status === "Overdue") {
      return (
        <span className="text-[11px] font-semibold text-rose-600 block mt-0.5">
          Overdue 45 days
        </span>
      );
    }
    if (item.invoiceId === "INV-3201") {
      return (
        <span className="text-[11px] font-semibold text-amber-600 block mt-0.5">
          Due in 5 days
        </span>
      );
    }
    if (item.invoiceId === "INV-3202") {
      return (
        <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
          Due in 10 days
        </span>
      );
    }
    if (item.invoiceId === "INV-3203") {
      return (
        <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
          Scheduled
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
        Due soon
      </span>
    );
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Export CSV
  const exportCsv = () => {
    const header = [
      "Invoice ID",
      "Client",
      "Due Date",
      "Status",
      "Paid",
      "Balance",
    ];
    const body = filteredData.map((r) =>
      [
        r.invoiceId,
        r.clientName,
        r.dueDate,
        r.status,
        `$${r.amountPaid}`,
        `$${r.amountDue}`,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full w-full bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 text-slate-900 font-sans">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sales Invoices
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                crm.source === "api"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-slate-200/70 text-slate-600 border border-slate-300",
              )}
            >
              {crm.source === "api"
                ? "Live CRM"
                : crm.loading
                  ? "Connecting…"
                  : "Demo"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV / PDF</span>
          </button>
          <button
            onClick={() =>
              router.push(
                "/finance/invoices/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#5249e0] text-white px-3 py-2 rounded-xl font-semibold text-sm shadow-md shadow-purple-500/10 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Outstanding Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              OUTSTANDING BALANCE
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              $
              {totalOutstanding > 0
                ? totalOutstanding.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "5,650.00"}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>Total unpaid receivable</span>
            </div>
          </div>
        </div>

        {/* Card 2: Paid Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              PAID INVOICES
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                $
                {totalPaid > 0
                  ? totalPaid.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })
                  : "14,200.00"}
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                ({paidItems.length || 8} settled)
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Successfully settled this month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              TOTAL INVOICES
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalCount || 12}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tracked in system</span>
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              OVERDUE INVOICES
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {overdueItems.length || 1}
              </h2>
              <span className="text-sm font-bold text-rose-600">
                $
                {totalOverdue > 0
                  ? totalOverdue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })
                  : "1,650.00"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Requires immediate attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle 3-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Card 1: Collections Overview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  COLLECTIONS OVERVIEW
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  Realtime revenue settlement
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Active
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              {/* Donut Chart SVG */}
              <div className="relative w-40 h-40 flex items-center justify-center my-1">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                    fill="transparent"
                  />

                  {/* Segment 1: Paid (Purple - 71.5%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#7C3AED"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.715)}
                  />

                  {/* Segment 2: Partial (Blue - 7%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#3B82F6"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.07)}
                    transform="rotate(257.4 50 50)"
                  />

                  {/* Segment 3: Draft / Sent (Slate - 13%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#94A3B8"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.13)}
                    transform="rotate(282.6 50 50)"
                  />

                  {/* Segment 4: Overdue (Red - 8.5%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#EF4444"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.085)}
                    transform="rotate(329.4 50 50)"
                  />
                </svg>

                {/* Donut Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-400 font-medium">
                    Total Volume
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    $19,850
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    71.5% Settled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                <span className="text-slate-600 font-medium">Paid</span>
              </div>
              <span className="font-bold text-slate-900">$14,200</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span className="text-slate-600 font-medium">Partial</span>
              </div>
              <span className="font-bold text-slate-900">$1,415</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                <span className="text-slate-600 font-medium">Draft / Sent</span>
              </div>
              <span className="font-bold text-slate-900">$2,585</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-slate-600 font-medium">Overdue</span>
              </div>
              <span className="font-bold text-slate-900">$1,650</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receivables Aging Analysis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  RECEIVABLES AGING ANALYSIS
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  Uncollected amounts by overdue maturity
                </p>
              </div>

              {/* Days / Months Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setAgingMode("days")}
                  className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all",
                    agingMode === "days"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  Days
                </button>
                <button
                  onClick={() => setAgingMode("months")}
                  className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all",
                    agingMode === "months"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  Months
                </button>
              </div>
            </div>

            {/* Aging Horizontal Progress Bars */}
            <div className="space-y-3.5 py-1">
              {/* Bar 1 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    Current (1 -30 Days)
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">$3,065.00</span>
                    <span className="text-slate-400 text-[11px] ml-1">
                      (54%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full w-[54%]" />
                </div>
              </div>

              {/* Bar 2 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    31 - 60 Days
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">$935.00</span>
                    <span className="text-slate-400 text-[11px] ml-1">
                      (17%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[17%]" />
                </div>
              </div>

              {/* Bar 3 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    61 - 90 Days
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">$0.00</span>
                    <span className="text-slate-400 text-[11px] ml-1">
                      (0%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full w-[0%]" />
                </div>
              </div>

              {/* Bar 4 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-rose-600">
                    90+ Days (Overdue Alert)
                  </span>
                  <div>
                    <span className="font-bold text-rose-600">$1,650.00</span>
                    <span className="text-rose-500 text-[11px] ml-1">
                      (29%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-rose-50 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-[29%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Banner */}
          <div className="mt-4 p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
            <span className="text-purple-900 font-medium">
              Next expected payout:{" "}
              <strong className="font-bold">$1,415.00</strong> on 29/07/2026
            </span>
            <button className="text-purple-700 font-bold underline hover:text-purple-900 transition-colors shrink-0 ml-2">
              View Forecast
            </button>
          </div>
        </div>

        {/* Card 3: Quick Operations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                QUICK OPERATIONS
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">
                Common billing workflows
              </p>
            </div>

            <div className="space-y-3">
              {/* Op 1 */}
              <div
                onClick={() =>
                  router.push(
                    "/finance/invoices/create?layoutid=standard&redirect=false",
                  )
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      New Sales Invoice
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Blank or from quote
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>

              {/* Op 2 */}
              <div
                onClick={() => router.push("/finance/payments")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Record Payment
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Manual offline receipt
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>

              {/* Op 3 */}
              <div
                onClick={() => router.push("/finance/invoices")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Send Reminder
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Email overdue batch
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => router.push("/finance/reports")}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1"
            >
              <span>Open Invoicing Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices by number, client name, or amount..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Draft">Status: Draft</option>
              <option value="Sent">Status: Sent</option>
              <option value="Partially Paid">Status: Partially Paid</option>
              <option value="Paid">Status: Paid</option>
              <option value="Overdue">Status: Overdue</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
            >
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Filters Button */}
          <button className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none transition-all cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">INVOICE</th>
                <th className="py-3.5 px-4">CLIENT</th>
                <th className="py-3.5 px-4">DUE DATE</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">PAID</th>
                <th className="py-3.5 px-4">BALANCE</th>
                <th className="py-3.5 px-6 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const initials = getInitials(item.clientName);

                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        router.push(`/finance/invoices/${item.id}`)
                      }
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Checkbox */}
                      <td
                        className="py-4 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>

                      {/* Invoice ID & Title */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-semibold text-purple-600 group-hover:underline block">
                          {item.invoiceId}
                        </span>
                        <span className="text-xs text-slate-500 font-normal leading-snug block">
                          {item.title}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0",
                              item.status === "Overdue"
                                ? "bg-rose-100 text-rose-700"
                                : item.status === "Paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-purple-100/70 text-purple-700",
                            )}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-snug">
                              {item.clientName}
                            </p>
                            <p className="text-xs text-slate-400 font-normal leading-snug">
                              {item.contactEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-700 font-medium text-xs sm:text-sm block">
                          {item.dueDate}
                        </span>
                        {getDueDateSubtext(item)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold inline-block text-center",
                            getStatusBadge(item.status),
                          )}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Paid */}
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700 text-sm">
                        $
                        {item.amountPaid.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Balance */}
                      <td className="py-4 px-4 whitespace-nowrap font-bold text-sm">
                        <span
                          className={
                            item.status === "Overdue"
                              ? "text-rose-600 font-bold"
                              : "text-slate-900"
                          }
                        >
                          $
                          {item.amountDue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.status === "Overdue" && (
                            <button
                              onClick={() =>
                                console.log(
                                  "Remind clicked for",
                                  item.invoiceId,
                                )
                              }
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition-colors"
                            >
                              Remind
                            </button>
                          )}
                          <button
                            onClick={() =>
                              router.push(`/finance/invoices/${item.id}`)
                            }
                            title="View invoice"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(
                                  activeMenuId === item.id ? null : item.id,
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === item.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs text-slate-700 text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    router.push(`/finance/invoices/${item.id}`);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Invoice</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    router.push(
                                      `/finance/payments?invoiceId=${item.id}`,
                                    );
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Record Payment</span>
                                </button>
                              </div>
                            )}
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

        {/* Table Footer / Pagination */}
        {/* <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Showing 1 to {filteredData.length} of {data.length || 12} entries
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-2">
              <span>Rows:</span>
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 pr-7 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer">
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 bg-[#635BFF] text-white rounded-lg font-semibold text-xs flex items-center justify-center shadow-xs">
                1
              </button>
              <button className="w-7 h-7 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs flex items-center justify-center transition-colors">
                2
              </button>
              <button className="w-7 h-7 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs flex items-center justify-center transition-colors">
                3
              </button>
              <span className="text-xs text-slate-400 px-1">...</span>
              <button className="w-7 h-7 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs flex items-center justify-center transition-colors">
                50
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div> */}
        <PaginationBar
          page={safePage}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          entriesLabel="estimates"
        />
      </div>

      {/* Bottom Row Grid (Recent Invoicing Events & Connect Bank Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoicing Events Card (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                RECENT INVOICING EVENTS
              </h3>
              <button
                onClick={() => router.push("/finance/audit")}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
              >
                Audit Trail
              </button>
            </div>

            <div className="space-y-4">
              {/* Event 1 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed">
                    Payment received for{" "}
                    <span className="font-bold text-purple-600">INV-3200</span>{" "}
                    ($4,200.00 settled via Direct Debit)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Metro West Capital • 23 min ago
                  </p>
                </div>
              </div>

              {/* Event 2 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed">
                    Partial payment recorded on{" "}
                    <span className="font-bold text-purple-600">INV-3201</span>{" "}
                    ($1,500.00 out of $2,915.00)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Greystone Realty • 3 hours ago by Priya
                  </p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed">
                    Automated reminder dispatched for{" "}
                    <span className="font-bold text-rose-600">INV-3204</span>{" "}
                    (Overdue notice 2)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Apex Property Group • 1 day ago by FinConnex Bot
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Bank Feed Banner Card (Span 1) */}
        <div className="bg-[#1E1256] text-white rounded-2xl p-6 shadow-md shadow-indigo-950/20 flex flex-col justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-700/60 uppercase tracking-wider inline-block mb-3">
              AUTO-RECONCILE
            </span>
            <h3 className="text-lg font-bold text-white leading-snug">
              Connect Bank Feed
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed font-normal">
              Match 8 unallocated bank deposits automatically to outstanding
              sales invoices with AI smart matching.
            </p>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-purple-800/40 mt-4">
            <span className="text-[11px] text-purple-300 font-medium">
              Equifax & Xero sync active
            </span>
            <button
              onClick={() => console.log("Connect Bank Feed")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicesPage;
