"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  Eye,
  MoreVertical,
  Building2,
  CreditCard,
  ArrowRightLeft,
  FileText,
} from "lucide-react";
import { formatAUD, type Payment, type PaymentStatus } from "@/lib/finance/payments/types";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

function parseWhen(value?: string) {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

const TABS: Array<"All" | PaymentStatus> = [
  "All",
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
];

export function PaymentsTable({ data }: { data: Payment[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = {
    All: data.length,
    Pending: data.filter((p) => p.status === "Pending").length,
    Completed: data.filter((p) => p.status === "Completed").length,
    Failed: data.filter((p) => p.status === "Failed").length,
    Refunded: data.filter((p) => p.status === "Refunded").length,
  };

  const filteredData = useMemo(() => {
    const days =
      dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : dateFilter === "90d" ? 90 : null;
    const cutoff = days ? Date.now() - days * 86_400_000 : null;

    return data.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.paymentId.toLowerCase().includes(q) ||
        item.invoiceRef.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        (item.reference ?? "").toLowerCase().includes(q);
      const matchesTab =
        statusTab === "All" || item.status.toLowerCase() === statusTab.toLowerCase();
      const matchesSelect =
        statusFilter === "All" || item.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchesSearch || !matchesTab || !matchesSelect) return false;
      if (!cutoff) return true;
      const at = parseWhen(item.receivedAt || item.createdAt)?.getTime();
      return at == null || at >= cutoff;
    });
  }, [data, search, statusTab, statusFilter, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusTab, statusFilter, dateFilter]);

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusTab(tab)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold",
              statusTab === tab
                ? "bg-[#6D5AE6] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                statusTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by ref, invoice, client..."
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
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
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

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">Payment Ref</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Transaction Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-violet-200" />
                    No payments found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/finance/payments/${item.id}`)}
                    className="cursor-pointer hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 font-semibold whitespace-nowrap text-violet-600">
                      {item.paymentId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-slate-900">{item.invoiceRef || "—"}</p>
                      {item.notes ? <p className="text-xs text-slate-400">{item.notes}</p> : null}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                            item.status === "Failed"
                              ? "bg-rose-100 text-rose-700"
                              : item.status === "Pending"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-violet-100 text-violet-700",
                          )}
                        >
                          {item.clientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <MethodCell item={item} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap text-slate-600">
                      {item.receivedAt || item.createdAt || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold whitespace-nowrap text-slate-900">
                      {formatAUD(item.amount)}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => router.push(`/finance/payments/${item.id}`)}
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
                                  router.push(`/finance/payments/${item.id}`);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
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
          entriesLabel="payments"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cls =
    status === "Completed"
      ? "bg-violet-100 text-violet-700"
      : status === "Pending"
        ? "bg-blue-100 text-blue-700"
        : status === "Failed"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Completed"
            ? "bg-violet-600"
            : status === "Pending"
              ? "bg-blue-600"
              : status === "Failed"
                ? "bg-rose-600"
                : "bg-slate-500",
        )}
      />
      {status}
    </span>
  );
}

function MethodCell({ item }: { item: Payment }) {
  const Icon =
    item.method === "Bank transfer"
      ? Building2
      : item.method === "Card" || item.method === "Stripe"
        ? CreditCard
        : ArrowRightLeft;
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs font-semibold text-slate-800">{item.method}</p>
        {item.reference ? <p className="text-[11px] text-slate-400">{item.reference}</p> : null}
      </div>
    </div>
  );
}
