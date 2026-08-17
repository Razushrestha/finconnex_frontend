"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";

export default function DocumentsList() {
  const router = useRouter();
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Row pending delete confirmation, and in-flight state for the modal's button
  const [deleteTarget, setDeleteTarget] = useState<SignatureRequest | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Load client-side requests after hydration to avoid mismatch
  useEffect(() => {
    setIsMounted(true);
    setRequests(listSignatureRequests());
  }, []);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.signatureRequestId
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      req.signers.some(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      (req.relatedTo &&
        req.relatedTo.toLowerCase().includes(searchQuery.toLowerCase()));

    const status = computeOverallStatus(req);
    const matchesStatus = statusFilter === "All" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRequests = filteredRequests.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const updated = deleteSignatureRequest(deleteTarget.id);
      setRequests(updated);
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

  // Prevent server-client markup discrepancy during initial mount
  if (!isMounted) {
    return null;
  }

  return (
    <div className="relative mx-auto flex w-full flex-col px-4 py-2">
      {/* Header section */}
      <div className="mb-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Signature Documents
          </h1>
        </div>
        {/* <button
          onClick={() => router.push("/documents/requests/create")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all "
        >
          <Plus className="h-4 w-4" />
          New Request
        </button> */}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-h-[560px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-sm font-semibold text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <th className="py-3.5 px-4 sm:px-6">Document Name</th>
                <th className="py-3.5 px-4">Recipients</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">Related To</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Sent</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-zinc-800">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
                  {paginatedRequests.map((req) => {
                    const overallStatus = computeOverallStatus(req);
                    return (
                      <tr
                        key={req.id}
                        onClick={() =>
                          router.push(`/signature/documents/details/${req.id}`)
                        }
                        className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 h-[56px] cursor-pointer"
                      >
                        <td className="py-2 px-4 sm:px-6">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="group/doc-name relative block max-w-[24ch]">
                                <span className="block truncate font-medium text-slate-900 dark:text-white">
                                  {req.documentName}
                                </span>
                                <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-xs whitespace-normal rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal text-white shadow-lg group-hover/doc-name:block dark:bg-zinc-800">
                                  {req.documentName}
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-zinc-400">
                                {req.signatureRequestId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {req.signers.slice(0, 2).map((signer) => {
                                const color =
                                  SIGNER_COLORS[
                                    signer.colorIndex % SIGNER_COLORS.length
                                  ];
                                return (
                                  <div
                                    key={signer.id}
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${color.bg} ${color.text} border ${color.border}`}
                                    title={`${signer.name} (${signer.email})`}
                                  >
                                    {getInitials(signer.name)}
                                  </div>
                                );
                              })}
                              {req.signers.length > 2 && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                  +{req.signers.length - 2}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[180px]">
                              {req.signers.map((s) => s.email).join(", ")}
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-medium dark:bg-zinc-800 dark:text-zinc-300">
                              {req.createdBy ? req.createdBy[0] : "F"}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                              {req.createdBy || "Finconnex"}
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <span className="text-xs text-slate-600 dark:text-zinc-400">
                            {req.relatedTo || "—"}
                          </span>
                        </td>

                        <td className="py-2 px-4">
                          {getStatusBadge(overallStatus)}
                        </td>

                        <td className="py-2 px-4 text-xs text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {req.sentDate || "—"}
                        </td>

                        <td className="py-2 px-4 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                          {req.audit && req.audit.length > 0
                            ? req.audit[req.audit.length - 1].at
                            : "Recently"}
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
                                    // TODO: point this at your actual edit route
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
                    length: Math.max(0, 10 - paginatedRequests.length),
                  }).map((_, index) => (
                    <tr key={`empty-${index}`} className="h-[56px] border-b-0">
                      <td colSpan={8} className="py-2 px-4 sm:px-6 border-b-0">
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
          page={safePage}
          pageSize={pageSize}
          total={filteredRequests.length}
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
