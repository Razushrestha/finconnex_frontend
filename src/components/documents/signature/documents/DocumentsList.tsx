"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  MoreVertical,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSignature,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  listSignatureRequests,
  deleteSignatureRequest,
  SIGNER_COLORS,
  computeOverallStatus,
  SignatureRequest,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import {
  deleteCrmSignatureRequest,
  isCrmSignatureRequestId,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { useCrmSignatureRequests } from "@/lib/documents/signature/use-crm-signature-requests";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useDataTable } from "@/hooks/useDataTable";

type ColumnKey =
  | "document"
  | "recipients"
  | "owner"
  | "relatedTo"
  | "status"
  | "sent"
  | "lastActivity"
  | "action";

const COLUMNS: { key: ColumnKey; label: string; align?: "right" }[] = [
  { key: "document", label: "Document Name" },
  { key: "recipients", label: "Recipients" },
  { key: "owner", label: "Owner" },
  { key: "relatedTo", label: "Related To" },
  { key: "status", label: "Status" },
  { key: "sent", label: "Sent" },
  { key: "lastActivity", label: "Last Activity" },
  { key: "action", label: "Action", align: "right" },
];

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  document: 260,
  recipients: 220,
  owner: 160,
  relatedTo: 150,
  status: 160,
  sent: 110,
  lastActivity: 140,
  action: 160,
};

const MIN_WIDTHS: Record<ColumnKey, number> = {
  document: 160,
  recipients: 140,
  owner: 100,
  relatedTo: 90,
  status: 140,
  sent: 90,
  lastActivity: 100,
  action: 130,
};

function CellText({
  children,
  tooltip,
  className = "",
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip content={tooltip ?? children} fullWidth>
      <span className={`block truncate ${className}`}>{children}</span>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

import React from "react";
import { Tooltip } from "@/components/ui/tooltip";

export default function DocumentsList() {
  const router = useRouter();
  const crm = useCrmSignatureRequests();

  const {
    isMounted,
    setItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    paginatedItems,
    filteredTotal,
    pageSize,
    widths,
    onMouseDown,
    resizeLineX,
    containerRef,
    activeResizeKey,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    setIsDeleting,
  } = useDataTable<SignatureRequest>({
    data: [],
    defaultWidths: DEFAULT_WIDTHS,
    minWidths: MIN_WIDTHS,
    pageSize: 8,
    searchFilterFn: (req, query) =>
      req.documentName.toLowerCase().includes(query.toLowerCase()) ||
      req.signatureRequestId.toLowerCase().includes(query.toLowerCase()) ||
      req.signers.some(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase()),
      ) ||
      // Wrap in Boolean() or use !! to guarantee a boolean return type
      Boolean(
        req.relatedTo &&
        req.relatedTo.toLowerCase().includes(query.toLowerCase()),
      ),
    statusFilterFn: (req, status) => computeOverallStatus(req) === status,
  });

  useEffect(() => {
    const refresh = () => {
      const documentsOnly = listSignatureRequests().filter(
        (req) => req.recordType !== "template",
      );
      setItems(documentsOnly);
    };
    refresh();
    return onRecordsChange(refresh);
  }, [setItems, crm.source, crm.loading]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      deleteSignatureRequest(deleteTarget.id);
      if (isCrmSignatureRequestId(deleteTarget.id)) {
        await tryCrmSignatureRequest(() =>
          deleteCrmSignatureRequest(deleteTarget.id),
        );
      }
      setItems((prev) => prev.filter((req) => req.id !== deleteTarget.id));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Signed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Signed
          </span>
        );
      case "Sent":
      case "Viewed":
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/60">
            <Clock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            In Progress
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Expired
          </span>
        );
      case "Declined":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {status}
          </span>
        );
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }

  if (!isMounted) return null;

  return (
    <div className="relative mx-auto flex w-full flex-col px-4 py-2">
      {/* Header section */}
      <div className="mb-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Signature Documents
            {crm.source === "api" ? (
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                Live CRM
              </span>
            ) : null}
          </h1>
        </div>
      </div>

      <hr className="mb-2 border-border" />

      {/* Filters and Search Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by document name, signer, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:w-auto">
            <span>
              Status:{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {statusFilter}
              </strong>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 rounded-xl border-slate-200 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {["All", "Sent", "Signed", "Expired", "Declined"].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`cursor-pointer text-xs font-medium ${
                  statusFilter === status
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400"
                    : "text-slate-700 dark:text-zinc-300"
                }`}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
        <div ref={containerRef} className="relative overflow-x-auto">
          {resizeLineX !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-violet-500 dark:bg-violet-400"
              style={{ left: resizeLineX }}
            />
          )}
          <table className="w-full table-fixed border-collapse text-left min-h-[560px]">
            <colgroup>
              {COLUMNS.map((col) => (
                <col key={col.key} style={{ width: widths[col.key] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-sm font-bold text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                {COLUMNS.map((col, i) => (
                  <th
                    key={col.key}
                    className={`group relative select-none py-3.5 px-4 ${
                      i === 0 ? "sm:px-6" : ""
                    } ${col.align === "right" ? "text-right sm:px-6" : ""}`}
                  >
                    <span className="block truncate">{col.label}</span>
                    <div
                      onMouseDown={onMouseDown(col.key)}
                      className={`absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:opacity-100 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                        activeResizeKey === col.key
                          ? "opacity-100 bg-violet-500/80"
                          : ""
                      }`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-zinc-800">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-24 text-center text-slate-500 dark:text-zinc-400"
                  >
                    <FileSignature className="mx-auto h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
                    <p className="font-medium text-slate-900 dark:text-white">
                      No documents found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                      Try tweaking your search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedItems.map((req) => {
                    const overallStatus = computeOverallStatus(req);
                    return (
                      <tr
                        key={req.id}
                        onClick={() =>
                          router.push(`/signature/documents/details/${req.id}`)
                        }
                        className="h-[56px] cursor-pointer transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/50"
                      >
                        <td className="py-2 px-4 sm:px-6">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 shrink-0 rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CellText
                                className="font-medium text-slate-900 dark:text-white"
                                tooltip={req.documentName}
                              >
                                {req.documentName}
                              </CellText>
                              <span className="block truncate text-xs text-slate-500 dark:text-zinc-400">
                                {req.signatureRequestId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="min-w-0">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              {req.signers.slice(0, 2).map((signer) => {
                                const color =
                                  SIGNER_COLORS[
                                    signer.colorIndex % SIGNER_COLORS.length
                                  ];
                                return (
                                  <Tooltip
                                    key={signer.id}
                                    content={`${signer.name} (${signer.email})`}
                                  >
                                    <div
                                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${color.bg} ${color.text} border ${color.border}`}
                                    >
                                      {getInitials(signer.name)}
                                    </div>
                                  </Tooltip>
                                );
                              })}
                              {req.signers.length > 2 && (
                                <Tooltip
                                  content={req.signers
                                    .slice(2)
                                    .map((s) => s.name)
                                    .join(", ")}
                                >
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    +{req.signers.length - 2}
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                            <CellText
                              className="text-xs text-slate-500 dark:text-zinc-400"
                              tooltip={req.signers
                                .map((s) => s.email)
                                .join(", ")}
                            >
                              {req.signers.map((s) => s.email).join(", ")}
                            </CellText>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {req.createdBy ? req.createdBy[0] : "F"}
                            </div>
                            <CellText className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                              {req.createdBy || "Finconnex"}
                            </CellText>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <CellText className="text-xs text-slate-600 dark:text-zinc-400">
                            {req.relatedTo || "—"}
                          </CellText>
                        </td>

                        <td className="py-2 px-4">
                          {getStatusBadge(overallStatus)}
                        </td>

                        <td className="py-2 px-4">
                          <CellText className="text-xs text-slate-600 dark:text-zinc-400">
                            {req.sentDate || "—"}
                          </CellText>
                        </td>

                        <td className="py-2 px-4">
                          <CellText className="text-xs text-slate-500 dark:text-zinc-400">
                            {req.audit && req.audit.length > 0
                              ? req.audit[req.audit.length - 1].at
                              : "Recently"}
                          </CellText>
                        </td>

                        <td className="py-2 px-4 sm:px-6 text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                router.push(`/signature/${req.id}`)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-36 rounded-xl border-slate-200 dark:border-zinc-800 dark:bg-zinc-950"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/signature/documents/${req.id}/edit`,
                                    )
                                  }
                                  className="cursor-pointer text-xs font-medium text-slate-700 dark:text-zinc-300"
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(req)}
                                  className="cursor-pointer text-xs font-medium text-rose-600 dark:text-rose-400"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {Array.from({
                    length: Math.max(0, 10 - paginatedItems.length),
                  }).map((_, index) => (
                    <tr key={`empty-${index}`} className="h-[56px] border-b-0">
                      <td
                        colSpan={COLUMNS.length}
                        className="py-2 px-4 sm:px-6 border-b-0"
                      >
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filteredTotal}
          onPageChange={setPage}
          entriesLabel="documents"
        />
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Delete document?
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  This will permanently delete{" "}
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    {deleteTarget.documentName}
                  </span>
                  . This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
