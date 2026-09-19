"use client";

import { useEffect, useMemo, useState } from "react";
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
  Zap,
} from "lucide-react";
import {
  listEstimates,
  type Estimate,
  type EstimateStatus,
} from "@/lib/finance/estimates/types";
import { useCrmEstimates } from "@/lib/finance/estimates/use-crm-estimates";
import { formatAUD } from "@/lib/finance/shared";
import { onRecordsChange } from "@/lib/records-sync";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CreateEstimateForm } from "@/components/finance/estimates/CreateEstimateForm";
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

function daysLeftLabel(validUntil: string, status: EstimateStatus) {
  if (status === "Rejected" || status === "Expired") {
    return { text: "Expired", className: "text-red-500" };
  }
  const d = parseWhen(validUntil);
  if (!d) return null;
  const n = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (n < 0) return { text: "Expired", className: "text-red-500" };
  return { text: `${n} day${n === 1 ? "" : "s"} left`, className: "text-amber-600" };
}

function statusBadge(status: EstimateStatus) {
  switch (status) {
    case "Accepted":
    case "Converted":
      return "bg-violet-100 text-violet-700";
    case "Sent":
      return "bg-blue-100 text-blue-700";
    case "Draft":
      return "bg-slate-100 text-slate-600";
    case "Rejected":
    case "Expired":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function probability(status: EstimateStatus) {
  switch (status) {
    case "Accepted":
    case "Converted":
      return { percent: 90, color: "bg-emerald-500", text: "90%" };
    case "Sent":
      return { percent: 60, color: "bg-blue-500", text: "60%" };
    case "Draft":
      return { percent: 30, color: "bg-amber-500", text: "30%" };
    default:
      return { percent: 0, color: "bg-slate-300", text: "0%" };
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

export function EstimatesPage() {
  const router = useRouter();
  const crm = useCrmEstimates();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [data, setData] = useState<Estimate[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<RelatedFinancePrefill>({});

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
    router.replace("/finance/estimates", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listEstimates());
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
        item.estimateId.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q);
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

  const pendingItems = data.filter((e) => e.status === "Sent" || e.status === "Draft");
  const totalPendingValue = pendingItems.reduce((acc, curr) => acc + curr.total, 0);
  const acceptedCount = data.filter(
    (e) => e.status === "Accepted" || e.status === "Converted",
  ).length;
  const totalCount = data.length;
  const conversionRate =
    totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

  const acceptedVal = data
    .filter((e) => e.status === "Accepted" || e.status === "Converted")
    .reduce((acc, c) => acc + c.total, 0);
  const sentVal = data.filter((e) => e.status === "Sent").reduce((acc, c) => acc + c.total, 0);
  const draftVal = data.filter((e) => e.status === "Draft").reduce((acc, c) => acc + c.total, 0);
  const rejectedVal = data
    .filter((e) => e.status === "Rejected" || e.status === "Expired")
    .reduce((acc, c) => acc + c.total, 0);
  const totalPipelineVal = acceptedVal + sentVal + draftVal + rejectedVal;

  const ring = [
    { label: "Accepted", value: acceptedVal, color: "#7C3AED" },
    { label: "Sent", value: sentVal, color: "#3B82F6" },
    { label: "Draft", value: draftVal, color: "#F59E0B" },
    { label: "Rejected", value: rejectedVal, color: "#EF4444" },
  ];

  const sentCount = data.filter((e) => e.status !== "Draft").length;
  const draftCount = data.filter((e) => e.status === "Draft").length;

  const activity = useMemo(() => {
    const events: {
      id: string;
      title: string;
      sub: string;
      tone: "ok" | "sent" | "new";
      at: number;
    }[] = [];
    for (const item of data) {
      const created = parseWhen(item.createdAt)?.getTime() ?? 0;
      events.push({
        id: `${item.id}-created`,
        title: `New estimate ${item.estimateId} was created`,
        sub: `By ${item.createdBy || item.owner || "team"} • ${relativeTime(item.createdAt)}`,
        tone: "new",
        at: created,
      });
      if (item.sentAt || item.status === "Sent" || item.status === "Accepted" || item.status === "Converted") {
        events.push({
          id: `${item.id}-sent`,
          title: `Estimate ${item.estimateId} was sent`,
          sub: `To ${item.clientName} • ${relativeTime(item.sentAt || item.createdAt)}`,
          tone: "sent",
          at: parseWhen(item.sentAt)?.getTime() ?? created,
        });
      }
      if (item.status === "Accepted" || item.status === "Converted") {
        events.push({
          id: `${item.id}-accepted`,
          title: `Estimate ${item.estimateId} was accepted`,
          sub: `By ${item.clientName} • ${relativeTime(item.createdAt)}`,
          tone: "ok",
          at: created + 1,
        });
      }
    }
    return events.sort((a, b) => b.at - a.at).slice(0, 3);
  }, [data]);

  const circ = 2 * Math.PI * 38;

  return (
    <div className="min-h-full w-full bg-[#F4F7FB] p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Estimates</h1>
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
            Track, manage and grow your estimates all in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5AE6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:bg-[#5B4BD4]"
        >
          <Plus className="h-4 w-4" />
          Create Estimate
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B4BDB] via-[#6E5AE8] to-[#8B6CF6] p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-30">
            <svg viewBox="0 0 320 56" className="h-full w-full" preserveAspectRatio="none">
              <path d="M0 40 C40 36 60 18 110 22 C160 26 180 38 230 28 C270 20 300 16 320 20 L320 56 L0 56 Z" fill="white" />
            </svg>
          </div>
          <div className="relative flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Pending Value</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="relative mt-3 text-[26px] font-bold tracking-tight">{formatAUD(totalPendingValue)}</p>
          <p className="relative mt-1 text-[11px] text-white/80">
            {pendingItems.length} Active pipeline value
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Adopted Estimates</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[26px] font-bold text-slate-900">{acceptedCount}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">Ready for conversion</p>
          <div className="pointer-events-none absolute right-4 bottom-3 flex h-8 items-end gap-0.5 opacity-70">
            {[8, 12, 9, 16, 11, 18, 14].map((h, i) => (
              <span key={i} className="w-1 rounded-full bg-emerald-300" style={{ height: h }} />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Estimates</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[26px] font-bold text-slate-900">{totalCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Tracked in system</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-violet-50/80 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Conversion Rate</p>
              <p className="mt-3 text-[26px] font-bold text-slate-900">{conversionRate}%</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {acceptedCount} of {totalCount} estimates adopted
              </p>
            </div>
            <ConversionRing value={conversionRate} />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search estimates, clients, projects..."
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
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Converted">Converted</option>
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
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Estimates
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-5 py-3">Estimate ID</th>
                    <th className="px-4 py-3">Client & Project</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Valid Until</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Probability</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        No estimates found.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => {
                      const prob = probability(item.status);
                      const until = daysLeftLabel(item.validUntil, item.status);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => router.push(`/finance/estimates/${item.id}`)}
                          className="cursor-pointer hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4 font-semibold whitespace-nowrap text-violet-600">
                            {item.estimateId}
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
                          <td className="px-4 py-4 text-sm whitespace-nowrap text-slate-600">
                            {item.createdAt || "—"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="block text-sm text-slate-600">{item.validUntil || "—"}</span>
                            {until ? (
                              <span className={cn("mt-0.5 block text-[11px] font-medium", until.className)}>
                                {until.text}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-sm font-bold whitespace-nowrap text-slate-900">
                            {formatAUD(item.total)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusBadge(item.status))}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">{prob.text}</span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div className={cn("h-full rounded-full", prob.color)} style={{ width: `${prob.percent}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => router.push(`/finance/estimates/${item.id}`)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
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
                                        router.push(`/finance/estimates/${item.id}`);
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
                                        router.push(`/finance/invoices/create?layoutid=standard&redirect=false`);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50"
                                    >
                                      <FileCheck className="h-3.5 w-3.5" />
                                      Convert to Invoice
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
              entriesLabel="estimates"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-slate-900">
                <Zap className="h-4 w-4 text-violet-500" />
                Recent Activity
              </h3>
              <div className="space-y-4">
                {activity.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-slate-400">No recent estimate activity.</p>
                ) : (
                  activity.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          event.tone === "ok"
                            ? "bg-emerald-50 text-emerald-600"
                            : event.tone === "sent"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-violet-50 text-violet-600",
                        )}
                      >
                        {event.tone === "ok" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : event.tone === "sent" ? (
                          <Send className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
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

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[14px] font-bold text-slate-900">Conversion Funnel</h3>
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <FunnelBar label="Total Estimates" count={totalCount} width="100%" tint="bg-violet-100 text-violet-800" />
                  <FunnelBar label="Sent" count={sentCount} width="85%" tint="bg-blue-100 text-blue-800" />
                  <FunnelBar label="Draft" count={draftCount} width="65%" tint="bg-amber-100 text-amber-800" />
                  <FunnelBar label="Accepted" count={acceptedCount} width="50%" tint="bg-emerald-100 text-emerald-800" />
                </div>
                <div className="flex w-[108px] shrink-0 flex-col items-center rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 px-3 py-4 text-center">
                  <p className="text-[28px] font-bold text-violet-600">{conversionRate}%</p>
                  <p className="text-[11px] font-semibold text-violet-700">Conversion Rate</p>
                  <TrendingUp className="mt-1 h-4 w-4 text-violet-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-bold text-slate-900">Pipeline Overview</h3>
            <div className="flex flex-col items-center gap-5 xl:flex-row">
              <div className="relative h-36 w-36 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="#EEF2FF" strokeWidth="14" fill="transparent" />
                  {(() => {
                    let offset = 0;
                    return ring.map((seg) => {
                      const pct = totalPipelineVal > 0 ? seg.value / totalPipelineVal : 0;
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
                          strokeLinecap="butt"
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[15px] font-bold text-slate-900">
                    {formatAUD(totalPipelineVal)}
                  </span>
                  <span className="text-[10px] text-slate-400">Total Pipeline</span>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2.5 text-xs">
                {ring.map((seg) => {
                  const pct = totalPipelineVal > 0 ? Math.round((seg.value / totalPipelineVal) * 100) : 0;
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
            <h3 className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-slate-900">
              <Zap className="h-4 w-4 text-violet-500" />
              Quick Actions
            </h3>
            <div className="space-y-2.5">
              <ActionRow
                icon={Plus}
                iconClass="bg-violet-100 text-violet-600"
                title="Create New Estimate"
                hint="Start a new estimate from scratch"
                onClick={() => setCreateOpen(true)}
              />
              <ActionRow
                icon={FileCheck}
                iconClass="bg-amber-100 text-amber-600"
                title="Convert to Invoice"
                hint="Convert accepted estimates to invoice"
                onClick={() => router.push("/finance/invoices")}
              />
              <ActionRow
                icon={LayoutTemplate}
                iconClass="bg-orange-100 text-orange-600"
                title="Estimate Templates"
                hint="Manage reusable estimate templates"
                onClick={() => setCreateOpen(true)}
              />
              <ActionRow
                icon={BarChart3}
                iconClass="bg-violet-100 text-violet-600"
                title="Reports & Analytics"
                hint="View detailed estimates reports"
                onClick={() => router.push("/reports")}
              />
            </div>
          </div>
        </div>
      </div>

      <CreateEstimateForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setData(listEstimates())}
        relatedKind={createPrefill.relatedKind}
        relatedName={createPrefill.relatedName}
        relatedId={createPrefill.relatedId}
        email={createPrefill.email}
      />
    </div>
  );
}

function ConversionRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <svg className="-rotate-90" width="52" height="52" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#EDE9FE" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="#7C3AED"
        strokeWidth="5"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function FunnelBar({
  label,
  count,
  width,
  tint,
}: {
  label: string;
  count: number;
  width: string;
  tint: string;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold", tint)} style={{ width }}>
      <span>{label}</span>
      <span className="font-bold">{count}</span>
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

export default EstimatesPage;
