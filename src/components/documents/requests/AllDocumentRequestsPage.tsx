"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import {
  DOCUMENT_REQUEST_BROKERS,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import {
  DOCUMENT_DISPLAY_STATUS_FILTERS,
  exportDocumentRequestsCsv,
  filterDocumentRequests,
  type DocumentSortKey,
  type DocumentStatusFilter,
} from "@/lib/documents/requests/dashboard";
import { DocumentRequestsList } from "@/components/documents/requests/DocumentRequestsList";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export function AllDocumentRequestsPage({
  rows,
  source,
  loading,
  error,
  onRefresh,
}: {
  rows: DocumentRequest[];
  source?: "api" | "demo";
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("All");
  const [requestedBy, setRequestedBy] = useState("All");
  const [sort, setSort] = useState<DocumentSortKey>("updated-desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      filterDocumentRequests(rows, {
        statusFilter,
        requestedBy,
        search,
        sort,
      }),
    [rows, statusFilter, requestedBy, search, sort],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="min-h-full bg-[#f4f2f7]">
      <div className="mx-auto w-full max-w-[1920px] px-5 py-5">
        <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <FileText className="h-4 w-4 shrink-0 text-[#5A32A3]" />
              All Requests
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  source === "api"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {source === "api"
                  ? "Live CRM"
                  : loading
                    ? "Connecting…"
                    : "Demo"}
              </span>
              {error && source === "demo" ? (
                <span className="text-[10px] font-normal text-slate-500">
                  {error}
                </span>
              ) : null}
            </h2>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <div className="relative w-[220px]">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => updateFilter(setSearch, e.target.value)}
                  placeholder="Applicant or request ID..."
                  className="h-8 w-full rounded-lg border border-[#E5E7EB] bg-white pr-2.5 pl-8 text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <select
                value={requestedBy}
                onChange={(e) => updateFilter(setRequestedBy, e.target.value)}
                className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none"
                aria-label="Requested by"
              >
                <option value="All">All requested by</option>
                {DOCUMENT_REQUEST_BROKERS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  updateFilter(
                    setStatusFilter,
                    e.target.value as DocumentStatusFilter,
                  )
                }
                className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none"
                aria-label="Status"
              >
                {DOCUMENT_DISPLAY_STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-slate-500 hover:bg-slate-50",
                  filtersOpen && "border-[#5A32A3]/40 bg-[#F3ECFB] text-[#5A32A3]",
                )}
                aria-label="Filter"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  exportDocumentRequestsCsv(filtered)
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <Link
                href="/documents/requests/create?layoutid=standard&redirect=false"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4c2a8a]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Request
              </Link>
            </div>
          </div>

          {filtersOpen ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-2.5 sm:px-5">
              <select
                value={sort}
                onChange={(e) =>
                  updateFilter(setSort, e.target.value as DocumentSortKey)
                }
                className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-700"
                aria-label="Sort"
              >
                <option value="updated-desc">Sort: Latest updated</option>
                <option value="updated-asc">Sort: Oldest updated</option>
                <option value="started-desc">Sort: Latest started</option>
                <option value="started-asc">Sort: Oldest started</option>
                <option value="status-asc">Sort: Status A–Z</option>
                <option value="status-desc">Sort: Status Z–A</option>
                <option value="progress">Sort: Progress</option>
              </select>
              <div className="flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    viewMode === "list"
                      ? "bg-[#5A32A3] text-white"
                      : "text-slate-500",
                  )}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    viewMode === "grid"
                      ? "bg-[#5A32A3] text-white"
                      : "text-slate-500",
                  )}
                >
                  Grid
                </button>
              </div>
            </div>
          ) : null}

          <DocumentRequestsList
            data={paged}
            viewMode={viewMode}
            framed={false}
            showSelect={false}
            onRefresh={onRefresh}
            sort={sort}
            onSortChange={(next) => updateFilter(setSort, next)}
          />

          <div className="flex flex-col gap-2 border-t border-[#E5E7EB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[12px] text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + (paged.length ? 1 : 0)} to{" "}
              {(safePage - 1) * PAGE_SIZE + paged.length} of {filtered.length}{" "}
              requests
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5A32A3] text-[12px] font-semibold text-white">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
