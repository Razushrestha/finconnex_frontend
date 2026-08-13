"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Plus,
  Search,
  List,
  LayoutGrid,
  Download,
} from "lucide-react";
import {
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_REQUEST_TYPES,
  buildDocumentRequestColumns,
  documentRequestColumns as initialColumns,
  listDocumentRequests,
  replaceDocumentRequests,
  type DocumentRequest,
  type DocumentRequestColumn,
  type DocumentRequestStatus,
  type DocumentRequestType,
} from "@/lib/documents/requests/types";
import {
  DocumentRequestsList,
  DocumentRequestCard,
} from "@/components/documents/requests/DocumentRequestsList";
import { cn } from "@/lib/utils";
import { BOARD_PAGE, KANBAN_HEADER, KANBAN_WELL } from "@/lib/layout";
import { dropTargetActive } from "@/lib/motion";

type ViewMode = "list" | "kanban";
type StatusTab = "All" | DocumentRequestStatus;

export default function DocumentRequestsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [typeFilter, setTypeFilter] = useState<DocumentRequestType | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [columns, setColumns] =
    useState<DocumentRequestColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<{
    requestId: string;
    sourceColumnId: string;
  } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  useEffect(() => {
    setColumns(buildDocumentRequestColumns(listDocumentRequests()));
  }, []);

  const allRequests = useMemo(
    () =>
      columns.flatMap((c) =>
        c.requests.map((r) => ({
          ...r,
          status: c.title as DocumentRequestStatus,
        })),
      ),
    [columns],
  );

  const statusCounts = useMemo(() => {
    const map = Object.fromEntries(
      DOCUMENT_REQUEST_STATUSES.map((s) => [s, 0]),
    ) as Record<DocumentRequestStatus, number>;
    for (const r of allRequests) map[r.status] += 1;
    return map;
  }, [allRequests]);

  const filtered = useMemo(() => {
    let data: DocumentRequest[] = allRequests;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (typeFilter !== "All")
      data = data.filter((r) => r.documentType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.requestId.toLowerCase().includes(q) ||
          r.requestedFrom.toLowerCase().includes(q) ||
          (r.relatedTo?.toLowerCase().includes(q) ?? false) ||
          r.requestedBy.toLowerCase().includes(q),
      );
    }
    return data;
  }, [allRequests, statusTab, typeFilter, search]);

  const visibleColumns = useMemo(() => {
    if (statusTab === "All") return columns;
    return columns.filter((c) => c.title === statusTab);
  }, [columns, statusTab]);

  function handleDrop(targetColumnId: string) {
    if (!dragInfo) return;
    const { requestId, sourceColumnId } = dragInfo;
    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      setOverCol(null);
      return;
    }
    setColumns((prev) => {
      const source = prev.find((c) => c.id === sourceColumnId);
      const request = source?.requests.find((r) => r.id === requestId);
      if (!request) return prev;
      const next = prev.map((col) => {
        if (col.id === sourceColumnId) {
          const requests = col.requests.filter((r) => r.id !== requestId);
          return { ...col, requests, count: requests.length };
        }
        if (col.id === targetColumnId) {
          const requests = [{ ...request, status: col.title }, ...col.requests];
          return { ...col, requests, count: requests.length };
        }
        return col;
      });
      replaceDocumentRequests(next.flatMap((c) => c.requests));
      return next;
    });
    setDragInfo(null);
    setOverCol(null);
  }

  function exportCsv() {
    const header = [
      "Request ID",
      "Title",
      "From",
      "Type",
      "Status",
      "Due",
      "Requested By",
    ];
    const rows = filtered.map((r) =>
      [
        r.requestId,
        r.title,
        r.requestedFrom,
        r.documentType,
        r.status,
        r.dueDate,
        r.requestedBy,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document-requests.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={BOARD_PAGE}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Document Requests
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <Link
              href="/documents/requests/create?layoutid=standard&redirect=false"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create request
            </Link>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={statusTab === "All"}
                onClick={() => setStatusTab("All")}
                label="All"
                count={allRequests.length}
              />
              {DOCUMENT_REQUEST_STATUSES.map((s) => (
                <TabBtn
                  key={s}
                  active={statusTab === s}
                  onClick={() => setStatusTab(s)}
                  label={s}
                  count={statusCounts[s]}
                  compact
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-40 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-48"
                />
              </div>
              <div className="flex items-center rounded-lg bg-slate-50 p-0.5">
                <button
                  type="button"
                  aria-label="List"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    view === "list"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Board"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    view === "kanban"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {view === "list" ? (
              <DocumentRequestsList data={filtered} embedded />
            ) : (
              <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
                {visibleColumns.map((column) => {
                  const requests = column.requests.filter((r) => {
                    if (typeFilter !== "All" && r.documentType !== typeFilter)
                      return false;
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      r.title.toLowerCase().includes(q) ||
                      r.requestId.toLowerCase().includes(q) ||
                      r.requestedFrom.toLowerCase().includes(q)
                    );
                  });
                  const isOver = overCol === column.id;
                  return (
                    <div
                      key={column.id}
                      className="flex min-h-[420px] w-72 shrink-0 flex-col gap-2"
                    >
                      <div className={KANBAN_HEADER}>
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-xs font-semibold text-slate-800 xl:text-sm">
                            {column.title}
                          </h3>
                          <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                            {requests.length}
                          </span>
                        </div>
                      </div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setOverCol(column.id);
                        }}
                        onDragLeave={() =>
                          setOverCol((p) => (p === column.id ? null : p))
                        }
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(column.id);
                        }}
                        className={cn(
                          "flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto rounded-sm border p-2",
                          isOver ? dropTargetActive : KANBAN_WELL,
                        )}
                      >
                        {requests.map((request) => (
                          <DocumentRequestCard
                            key={request.id}
                            request={request}
                            columnId={column.id}
                            isDragging={dragInfo?.requestId === request.id}
                            onDragStart={(e) => {
                              setDragInfo({
                                requestId: request.id,
                                sourceColumnId: column.id,
                              });
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDragInfo(null);
                              setOverCol(null);
                            }}
                          />
                        ))}
                        {requests.length === 0 ? (
                          <p className="py-8 text-center text-[11px] text-slate-300">
                            Empty
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
        compact && "hidden xl:inline-flex",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
          active
            ? "bg-violet-100 text-violet-700"
            : "bg-slate-200/80 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
