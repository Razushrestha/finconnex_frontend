"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  TrendingUp,
  Send,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  FileCheck,
  LayoutTemplate,
  BarChart3,
  Clock,
} from "lucide-react";
import {
  listEstimates,
  type Estimate,
  type EstimateStatus,
} from "@/lib/finance/estimates/types";
import { useCrmEstimates } from "@/lib/finance/estimates/use-crm-estimates";
import { onRecordsChange } from "@/lib/records-sync";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

export function EstimatesPage() {
  const router = useRouter();
  const crm = useCrmEstimates();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [data, setData] = useState<Estimate[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listEstimates());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  // Filter logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.estimateId.toLowerCase().includes(search.toLowerCase()) ||
        item.clientName.toLowerCase().includes(search.toLowerCase()) ||
        item.title.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  // Reset to page 1 whenever the filtered set changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  // Slice for the current page/pageSize
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  // Calculate Metrics dynamically
  const pendingItems = data.filter(
    (e) => e.status === "Sent" || e.status === "Draft",
  );
  const totalPendingValue = pendingItems.reduce(
    (acc, curr) => acc + curr.total,
    0,
  );
  const acceptedCount = data.filter(
    (e) => e.status === "Accepted" || e.status === "Converted",
  ).length;
  const totalCount = data.length;
  const conversionRate =
    totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 25;

  // Pipeline overview math
  const acceptedVal = data
    .filter((e) => e.status === "Accepted" || e.status === "Converted")
    .reduce((acc, c) => acc + c.total, 0);
  const sentVal = data
    .filter((e) => e.status === "Sent")
    .reduce((acc, c) => acc + c.total, 0);
  const draftVal = data
    .filter((e) => e.status === "Draft")
    .reduce((acc, c) => acc + c.total, 0);
  const rejectedVal = data
    .filter((e) => e.status === "Rejected" || e.status === "Expired")
    .reduce((acc, c) => acc + c.total, 0);
  const totalPipelineVal = acceptedVal + sentVal + draftVal + rejectedVal;

  const acceptedPct =
    totalPipelineVal > 0
      ? Math.round((acceptedVal / totalPipelineVal) * 100)
      : 17;
  const sentPct =
    totalPipelineVal > 0 ? Math.round((sentVal / totalPipelineVal) * 100) : 50;
  const draftPct =
    totalPipelineVal > 0 ? Math.round((draftVal / totalPipelineVal) * 100) : 7;
  const rejectedPct =
    totalPipelineVal > 0
      ? Math.round((rejectedVal / totalPipelineVal) * 100)
      : 26;

  // Helper for status styles
  const getStatusBadge = (status: EstimateStatus) => {
    switch (status) {
      case "Accepted":
      case "Converted":
        return "bg-purple-100 text-purple-700 border border-purple-200/60";
      case "Sent":
        return "bg-blue-100 text-blue-700 border border-blue-200/60";
      case "Draft":
        return "bg-slate-100 text-slate-700 border border-slate-200/60";
      case "Rejected":
      case "Expired":
        return "bg-red-100 text-red-700 border border-red-200/60";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Helper for probability & progress bar
  const getProbabilityInfo = (status: EstimateStatus) => {
    switch (status) {
      case "Accepted":
      case "Converted":
        return { percent: 90, color: "bg-emerald-500", text: "90%" };
      case "Sent":
        return { percent: 60, color: "bg-blue-500", text: "60%" };
      case "Draft":
        return { percent: 30, color: "bg-amber-500", text: "30%" };
      case "Rejected":
      case "Expired":
        return { percent: 0, color: "bg-slate-300", text: "0%" };
      default:
        return { percent: 50, color: "bg-purple-500", text: "50%" };
    }
  };

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Helper for valid until subtext
  const getValidUntilSubtext = (item: Estimate) => {
    if (item.status === "Rejected" || item.status === "Expired") {
      return (
        <span className="text-[11px] font-medium text-red-500 block mt-0.5">
          Expired
        </span>
      );
    }
    if (item.estimateId === "EST-2025-0004")
      return (
        <span className="text-[11px] font-medium text-amber-600 block mt-0.5">
          30 days left
        </span>
      );
    if (item.estimateId === "EST-2025-0003")
      return (
        <span className="text-[11px] font-medium text-amber-600 block mt-0.5">
          24 days left
        </span>
      );
    if (item.estimateId === "EST-2025-0002")
      return (
        <span className="text-[11px] font-medium text-amber-600 block mt-0.5">
          14 days left
        </span>
      );
    return (
      <span className="text-[11px] font-medium text-amber-600 block mt-0.5">
        30 days left
      </span>
    );
  };

  return (
    <div className="min-h-full w-full bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 text-slate-900 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Estimates
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

        <button
          onClick={() =>
            router.push(
              "/finance/estimates/create?layoutid=standard&redirect=false",
            )
          }
          className="inline-flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#5249e0] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-purple-500/10 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Estimate</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Pending Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              PENDING VALUE
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              $
              {totalPendingValue > 0
                ? totalPendingValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "5,005.00"}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="text-slate-400 font-semibold">≈</span>
              <span>{pendingItems.length || 2} Active pipeline value</span>
            </div>
          </div>
        </div>

        {/* Card 2: Adopted Estimates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              ADOPTED ESTIMATES
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {acceptedCount || 1}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for conversion</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Estimates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              TOTAL ESTIMATES
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalCount || 4}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tracked in system</span>
            </div>
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              CONVERSION RATE
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {conversionRate}%
            </h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">🎯</span>
              <span>
                {acceptedCount || 1} of {totalCount || 4} estimates adopted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search estimates, clients, projects..."
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
              <option value="Accepted">Status: Accepted</option>
              <option value="Rejected">Status: Rejected</option>
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

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Table Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Estimates</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ESTIMATE ID</th>
                    <th className="py-3.5 px-4">CLIENT & PROJECT</th>
                    <th className="py-3.5 px-4">ISSUE DATE</th>
                    <th className="py-3.5 px-4">VALID UNTIL</th>
                    <th className="py-3.5 px-4">TOTAL VALUE</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4">PROBABILITY</th>
                    <th className="py-3.5 px-6 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-400"
                      >
                        No estimates found.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => {
                      const prob = getProbabilityInfo(item.status);
                      const initials = getInitials(item.clientName);

                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            router.push(`/finance/estimates/${item.id}`)
                          }
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Estimate ID */}
                          <td className="py-4 px-6 font-semibold text-purple-600 group-hover:underline whitespace-nowrap">
                            {item.estimateId}
                          </td>

                          {/* Client & Project */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100/70 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm leading-snug">
                                  {item.clientName}
                                </p>
                                <p className="text-xs text-slate-500 font-normal leading-snug">
                                  {item.title}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Issue Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium text-xs sm:text-sm">
                            {item.createdAt || "31/05/2025"}
                          </td>

                          {/* Valid Until */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-slate-700 font-medium text-xs sm:text-sm block">
                              {item.validUntil}
                            </span>
                            {getValidUntilSubtext(item)}
                          </td>

                          {/* Total Value */}
                          <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-900 text-sm">
                            $
                            {item.total.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
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

                          {/* Probability */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-700 block mb-1">
                              {prob.text}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  prob.color,
                                )}
                                style={{ width: `${prob.percent}%` }}
                              />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <div
                              className="flex items-center justify-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  router.push(`/finance/estimates/${item.id}`)
                                }
                                title="View estimate"
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
                                        router.push(
                                          `/finance/estimates/${item.id}`,
                                        );
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        router.push(
                                          `/finance/invoices?estimateId=${item.id}`,
                                        );
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Convert to Invoice</span>
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
              entriesLabel="estimates"
            />
          </div>

          {/* Bottom Left Sub-grid: Recent Activity & Conversion Funnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-4">
                {/* Event 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-700 font-normal">
                      Estimate{" "}
                      <span className="font-bold text-slate-900">
                        EST-2025-0004
                      </span>{" "}
                      was accepted
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      By Greystone Realty • 2 hours ago
                    </p>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-700 font-normal">
                      Estimate{" "}
                      <span className="font-bold text-slate-900">
                        EST-2025-0003
                      </span>{" "}
                      was sent
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      To Harbour Labs • 1 day ago
                    </p>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-700 font-normal">
                      New estimate{" "}
                      <span className="font-bold text-slate-900">
                        EST-2025-0002
                      </span>{" "}
                      was created
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      By Deepak Shrestha • 2 days ago
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Funnel Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Conversion Funnel
              </h3>
              <div className="flex items-center justify-between gap-4">
                {/* Horizontal Funnel Bars */}
                <div className="flex-1 space-y-2.5">
                  {/* Bar 1 */}
                  <div className="bg-purple-50/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-purple-900">
                    <span>Total Estimates</span>
                    <span className="font-bold">4</span>
                  </div>

                  {/* Bar 2 */}
                  <div className="w-[85%] bg-blue-50/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-blue-900">
                    <span>Sent</span>
                    <span className="font-bold">2</span>
                  </div>

                  {/* Bar 3 */}
                  <div className="w-[65%] bg-amber-50/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-amber-900">
                    <span>Viewed</span>
                    <span className="font-bold">1</span>
                  </div>

                  {/* Bar 4 */}
                  <div className="w-[50%] bg-emerald-50/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span>Accepted</span>
                    <span className="font-bold">1</span>
                  </div>
                </div>

                {/* Stat side */}
                <div className="w-28 pl-4 border-l border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-purple-600 tracking-tight">
                    {conversionRate}%
                  </span>
                  <span className="text-[11px] font-bold text-purple-700 mt-1">
                    Conversion Rate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Pipeline Overview Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Pipeline Overview
            </h3>

            <div className="flex flex-col items-center sm:flex-row lg:flex-col xl:flex-row gap-5 py-2">
              {/* Donut Chart SVG */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  {/* Track Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                    fill="transparent"
                  />

                  {/* Ring Segment 1: Accepted (Purple - 17%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#7C3AED"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.17)}
                  />

                  {/* Ring Segment 2: Sent (Blue - 50%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#3B82F6"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.5)}
                    transform="rotate(61.2 50 50)"
                  />

                  {/* Ring Segment 3: Draft (Yellow - 7%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.07)}
                    transform="rotate(241.2 50 50)"
                  />

                  {/* Ring Segment 4: Rejected (Red - 26%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#EF4444"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.26)}
                    transform="rotate(266.4 50 50)"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold text-slate-900">
                    $12,820
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Total Pipeline
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2.5 flex-1 w-full text-xs">
                {/* Legend Item 1 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                    <span className="text-slate-600 font-medium">Accepted</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${acceptedVal > 0 ? acceptedVal.toLocaleString() : "2,195"}{" "}
                    ({acceptedPct}%)
                  </span>
                </div>

                {/* Legend Item 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span className="text-slate-600 font-medium">Sent</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${sentVal > 0 ? sentVal.toLocaleString() : "6,370"} (
                    {sentPct}%)
                  </span>
                </div>

                {/* Legend Item 3 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-slate-600 font-medium">Draft</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${draftVal > 0 ? draftVal.toLocaleString() : "935"} (
                    {draftPct}%)
                  </span>
                </div>

                {/* Legend Item 4 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-slate-600 font-medium">Rejected</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${rejectedVal > 0 ? rejectedVal.toLocaleString() : "3,320"}{" "}
                    ({rejectedPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {/* Action 1 */}
              <div
                onClick={() =>
                  router.push(
                    "/finance/estimates/create?layoutid=standard&redirect=false",
                  )
                }
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Create New Estimate
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Start a new estimate from scratch
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>

              {/* Action 2 */}
              <div
                onClick={() => router.push("/finance/invoices")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Convert to Invoice
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Convert accepted estimates to invoice
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>

              {/* Action 3 */}
              <div
                onClick={() => router.push("/finance/estimates")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Estimate Templates
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Manage reusable estimate templates
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>

              {/* Action 4 */}
              <div
                onClick={() => router.push("/finance/reports")}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Reports & Analytics
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      View detailed estimates reports
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EstimatesPage;
