"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
} from "lucide-react";
import { Payment, PaymentStatus } from "@/lib/finance/payments/types";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

interface PaymentsTableProps {
  data: Payment[];
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({ data }) => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status Tab Counts
  const counts = {
    All: data.length,
    Pending: data.filter((p) => p.status === "Pending").length,
    Completed: data.filter((p) => p.status === "Completed").length,
    Failed: data.filter((p) => p.status === "Failed").length,
    Refunded: data.filter((p) => p.status === "Refunded").length,
  };

  // Filtered Payments
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.paymentId.toLowerCase().includes(search.toLowerCase()) ||
        item.invoiceRef.toLowerCase().includes(search.toLowerCase()) ||
        item.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (item.reference ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesTab =
        statusTab === "All" ||
        item.status.toLowerCase() === statusTab.toLowerCase();

      const matchesSelect =
        statusFilter === "All" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesTab && matchesSelect;
    });
  }, [data, search, statusTab, statusFilter]);

  // Reset to page 1 whenever the filtered set changes (new search/filter/tab)
  useEffect(() => {
    setPage(1);
  }, [search, statusTab, statusFilter, dateFilter]);

  // Slice for the current page/pageSize
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  // Helper for Status Badge
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100/70 text-purple-700 border border-purple-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Completed
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/70 text-blue-700 border border-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Pending
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/70 text-rose-700 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Failed
          </span>
        );
      case "Refunded":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Refunded
          </span>
        );
      default:
        return null;
    }
  };

  // Helper for Payment Method Details & Icon
  const getMethodDetails = (item: Payment) => {
    if (item.method === "Bank transfer") {
      return (
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Bank transfer
            </p>
            <p className="text-[11px] text-slate-400 font-normal">
              ({item.reference || "EFT matched"})
            </p>
          </div>
        </div>
      );
    }
    if (item.method === "Stripe") {
      return (
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-800">Stripe</p>
            <p className="text-[11px] text-slate-400 font-normal">
              ({item.reference || "Card **4242"})
            </p>
          </div>
        </div>
      );
    }
    if (item.method === "Card") {
      return (
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-600">Card</p>
            <p className="text-[11px] text-rose-500 font-medium">
              ({item.reference || "Declined: Insufficient"})
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2.5">
        <ArrowRightLeft className="w-4 h-4 text-slate-500 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-slate-800">Direct Debit</p>
          <p className="text-[11px] text-slate-400 font-normal">
            ({item.reference || "Ezidebit"})
          </p>
        </div>
      </div>
    );
  };

  // Helper for Client Initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div>
      {/* Top Status Tabs Bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusTab("All")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            statusTab === "All"
              ? "bg-[#635BFF] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              statusTab === "All"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {counts.All}
          </span>
        </button>

        <button
          onClick={() => setStatusTab("Pending")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            statusTab === "Pending"
              ? "bg-[#635BFF] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          <span>Pending</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              statusTab === "Pending"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {counts.Pending}
          </span>
        </button>

        <button
          onClick={() => setStatusTab("Completed")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            statusTab === "Completed"
              ? "bg-[#635BFF] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          <span>Completed</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              statusTab === "Completed"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {counts.Completed}
          </span>
        </button>

        <button
          onClick={() => setStatusTab("Failed")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            statusTab === "Failed"
              ? "bg-[#635BFF] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          <span>Failed</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              statusTab === "Failed"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {counts.Failed}
          </span>
        </button>

        <button
          onClick={() => setStatusTab("Refunded")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            statusTab === "Refunded"
              ? "bg-[#635BFF] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          <span>Refunded</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              statusTab === "Refunded"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {counts.Refunded}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by ref, invoice, client..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Select */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Completed">Status: Completed</option>
              <option value="Pending">Status: Pending</option>
              <option value="Failed">Status: Failed</option>
              <option value="Refunded">Status: Refunded</option>
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
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">PAYMENT REF</th>
                <th className="py-3.5 px-4">INVOICE</th>
                <th className="py-3.5 px-4">CLIENT</th>
                <th className="py-3.5 px-4">METHOD</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">TRANSACTION DATE</th>
                <th className="py-3.5 px-4">AMOUNT</th>
                <th className="py-3.5 px-6 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payments found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const initials = getInitials(item.clientName);

                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        router.push(`/finance/payments/${item.id}`)
                      }
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Payment Ref */}
                      <td className="py-4 px-6 font-semibold text-purple-600 group-hover:underline whitespace-nowrap">
                        {item.paymentId}
                      </td>

                      {/* Invoice */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm block">
                          {item.invoiceRef}
                        </span>
                        <span className="text-xs text-slate-500 font-normal leading-snug block">
                          {item.notes}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0",
                              item.status === "Failed"
                                ? "bg-rose-100 text-rose-700"
                                : item.status === "Pending"
                                  ? "bg-blue-100 text-blue-700"
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
                              {item.clientName
                                .toLowerCase()
                                .replace(/\s+/g, "")}
                              @example.com
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Method */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getMethodDetails(item)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Transaction Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium text-xs sm:text-sm">
                        {item.receivedAt}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-900 text-sm">
                        $
                        {item.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.status === "Failed" && (
                            <button
                              onClick={() =>
                                console.log("Retry payment", item.paymentId)
                              }
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition-colors inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                          <button
                            onClick={() =>
                              router.push(`/finance/payments/${item.id}`)
                            }
                            title="View details"
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
                                    router.push(`/finance/payments/${item.id}`);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Details</span>
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
        <PaginationBar
          page={safePage}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          entriesLabel="entries"
        />
      </div>
    </div>
  );
};
