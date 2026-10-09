"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signatureRequests as seed,
  listSignatureRequests,
  type SignatureRequest,
  deleteSignatureRequest,
  computeOverallStatus,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import { confirmDialog } from "@/lib/notify/dialog";
import {
  deleteCrmSignatureRequest,
  isCrmSignatureRequestId,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { useCrmSignatureRequests } from "@/lib/documents/signature/use-crm-signature-requests";
import { RecentTabsHeader } from "@/components/documents/signature/overview/RecentTabsHeader";
import { RecentDocumentsToolbar } from "@/components/documents/signature/overview/RecentDocumentsToolbar";
import {
  EMPTY_RECENT_DOC_FILTERS,
  filterRecentDocuments,
  type RecentDocFilters,
  type RecentDocSort,
  type RecentDocStatus,
} from "@/lib/documents/signature/recent-filters";
import SignatureStatsGrid from "@/components/documents/signature/overview/SignatureStatsGrid";
import {
  FileText,
  MoreVertical,
  CheckCircle2,
  Clock,
  CalendarX2,
  Pencil,
  Trash2,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { HeaderColumnGrip } from "@/components/common/ColumnResizeHandle";
import { ESignatureHeader } from "@/components/documents/signature/ESignatureHeader";
import { SignatureRelatedToLink } from "@/components/documents/signature/SignatureRelatedToLink";
import { Tooltip } from "@/components/ui/tooltip";
import { useDataTable } from "@/hooks/useDataTable";
import {
  formatRelativeTime,
  parseFlexibleDate,
} from "@/lib/leads/activity-dates";

const DOC_DEFAULT_WIDTHS = {
  name: 240,
  recipients: 200,
  owner: 150,
  relatedTo: 170,
  status: 140,
  sent: 110,
  lastActivity: 130,
  action: 140,
};

const DOC_MIN_WIDTHS = {
  name: 160,
  recipients: 140,
  owner: 100,
  relatedTo: 100,
  status: 110,
  sent: 90,
  lastActivity: 100,
  action: 120,
};

function initialsFor(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CU"
  );
}

function ownerLabel(doc: SignatureRequest): string {
  const name = doc.createdBy?.trim();
  if (!name || name === "—") return "—";
  return name;
}

function ownerInitial(doc: SignatureRequest): string {
  const name = ownerLabel(doc);
  if (name === "—") return "?";
  return name[0]?.toUpperCase() || "?";
}

function recipientLabel(doc: SignatureRequest): string {
  const fromSigners = doc.signers
    ?.map((s) => s.name?.trim() || s.email?.trim())
    .filter(Boolean);
  if (fromSigners?.length) return fromSigners.join(", ");
  return doc.signer?.trim() || doc.signerEmail?.trim() || "—";
}

function lastActivityLabel(doc: SignatureRequest): string {
  const auditAt = doc.audit?.length
    ? doc.audit[doc.audit.length - 1]?.at
    : undefined;
  const raw = doc.updatedAt || auditAt || doc.sentDate || doc.signedDate;
  if (!raw) return "—";
  const parsed = parseFlexibleDate(raw) ?? new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return formatRelativeTime(parsed);
}

// Row actions for a recent document.
function RowActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-40 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ESignatureOverviewPage() {
  const router = useRouter();
  const crm = useCrmSignatureRequests();
  const [docQuery, setDocQuery] = useState("");
  const [docSort, setDocSort] = useState<RecentDocSort>("activity-desc");
  const [docFilters, setDocFilters] = useState<RecentDocFilters>(
    EMPTY_RECENT_DOC_FILTERS,
  );

  // Source data lives in local state now (instead of being handed to
  // useDataTable once) so edit/delete can mutate it and have the table
  // re-sync via the effects below.
  const [docsSource, setDocsSource] = useState<SignatureRequest[]>(
    seed.filter((doc) => doc.recordType !== "template"),
  );

  const visibleDocs = useMemo(
    () =>
      filterRecentDocuments(docsSource, {
        query: docQuery,
        sort: docSort,
        filters: docFilters,
      }),
    [docsSource, docQuery, docSort, docFilters],
  );
  const docOwners = useMemo(() => {
    const names = new Set<string>();
    for (const doc of docsSource) {
      const name = doc.createdBy?.trim();
      if (name && name !== "—") names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [docsSource]);
  const docFilterKey = JSON.stringify({ docQuery, docSort, docFilters });

  const documentsTable = useDataTable<SignatureRequest>({
    data: visibleDocs,
    defaultWidths: DOC_DEFAULT_WIDTHS,
    minWidths: DOC_MIN_WIDTHS,
    pageSize: 5,
    searchFilterFn: () => true,
  });

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => {
      const all = listSignatureRequests();
      setDocsSource(all.filter((doc) => doc.recordType !== "template"));
    };
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading, crm.workspaceId]);

  useEffect(() => {
    documentsTable.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docFilterKey]);

  function handleEditDocument(doc: SignatureRequest) {
    router.push(`/signature/${doc.id}/edit`);
  }

  async function handleDeleteDocument(doc: SignatureRequest) {
    if (
      !(await confirmDialog({
        title: "Delete document?",
        message: `Delete "${doc.documentName}"? This action can't be undone.`,
        confirmText: "Delete",
        tone: "danger",
      }))
    )
      return;
    deleteSignatureRequest(doc.id);
    if (isCrmSignatureRequestId(doc.id)) {
      void tryCrmSignatureRequest(() => deleteCrmSignatureRequest(doc.id));
    }
    setDocsSource((prev) =>
      prev.filter((d) => d.signatureRequestId !== doc.signatureRequestId),
    );
  }

  const activeDocs = documentsTable;
  const totalItems = activeDocs.filteredTotal;

  if (!documentsTable.isMounted) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 pb-3">
      <div className="shrink-0">
        <ESignatureHeader
          source={crm.source}
          loading={crm.loading}
          error={crm.error}
        />
      </div>

      <div className="mt-4 shrink-0">
        <SignatureStatsGrid
          activeStatus={
            docFilters.statuses.length === 0
              ? null
              : docFilters.statuses.length === 1
                ? docFilters.statuses[0]
                : undefined
          }
          onSelect={(status: RecentDocStatus | null) =>
            setDocFilters((current) => ({
              ...current,
              statuses: status ? [status] : [],
            }))
          }
        />
      </div>

      {/* Main Content Table Section */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="shrink-0">
        <RecentTabsHeader
          actions={
            <RecentDocumentsToolbar
              query={docQuery}
              onQueryChange={setDocQuery}
              sort={docSort}
              onSortChange={setDocSort}
              filters={docFilters}
              onFiltersChange={setDocFilters}
              owners={docOwners}
            />
          }
        />
        </div>

        {/* Table View */}
        <div
          ref={activeDocs.containerRef}
          className="relative min-h-0 flex-1 overflow-auto"
        >
          {activeDocs.resizeLineX !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-slate-300"
              style={{ left: `${activeDocs.resizeLineX}px` }}
            />
          )}

          <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: activeDocs.widths.name }} />
                <col style={{ width: activeDocs.widths.recipients }} />
                <col style={{ width: activeDocs.widths.owner }} />
                <col style={{ width: activeDocs.widths.relatedTo }} />
                <col style={{ width: activeDocs.widths.status }} />
                <col style={{ width: activeDocs.widths.sent }} />
                <col style={{ width: activeDocs.widths.lastActivity }} />
                <col style={{ width: activeDocs.widths.action }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
                  {(
                    [
                      ["name", "Document Name"],
                      ["recipients", "Applicants / Recipients"],
                      ["owner", "Owner"],
                      ["relatedTo", "Related To"],
                      ["status", "Status"],
                      ["sent", "Sent"],
                      ["lastActivity", "Last Activity"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="group relative select-none py-3 px-4"
                    >
                      {label}
                      <HeaderColumnGrip
                        active={activeDocs.activeResizeKey === key}
                        onMouseDown={activeDocs.onMouseDown(key)}
                      />
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right select-none">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
                {activeDocs.paginatedItems.length > 0 ? (
                  activeDocs.paginatedItems.map((doc) => (
                    <tr
                      key={doc.signatureRequestId}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={doc.documentName} fullWidth>
                              <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {doc.documentName}
                            </div>
                            </Tooltip>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
                              {computeOverallStatus(doc)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                            {(doc.signers?.length
                              ? doc.signers
                              : [{ name: doc.signer, email: doc.signerEmail }]
                            )
                              .slice(0, 2)
                              .map((signer, index) => (
                                <span
                                  key={`${doc.id}-s-${index}`}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white dark:ring-zinc-950 ${
                                    index === 0
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-violet-100 text-violet-700"
                                  }`}
                                >
                                  {initialsFor(
                                    signer.name || signer.email || "?",
                                  )}
                            </span>
                              ))}
                          </div>
                          <Tooltip content={recipientLabel(doc)} fullWidth>
                            <span className="block truncate text-slate-500">
                              {recipientLabel(doc)}
                          </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold dark:bg-zinc-800 dark:text-zinc-300">
                            {ownerInitial(doc)}
                          </div>
                          <Tooltip content={ownerLabel(doc)} fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              {ownerLabel(doc)}
                          </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tooltip
                          content={doc.relatedTo || "—"}
                          fullWidth
                        >
                          <SignatureRelatedToLink relatedTo={doc.relatedTo} />
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            doc.status === "Signed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : doc.status === "Expired"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                          }`}
                        >
                          {doc.status === "Signed" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {doc.status === "Expired" && (
                            <CalendarX2 className="h-3 w-3" />
                          )}
                          {doc.status !== "Signed" &&
                            doc.status !== "Expired" && (
                              <Clock className="h-3 w-3" />
                            )}
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content={doc.sentDate || "—"} fullWidth>
                          <span className="block truncate">
                            {doc.sentDate || "—"}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content={lastActivityLabel(doc)} fullWidth>
                          <span className="block truncate">
                            {lastActivityLabel(doc)}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/signature/${doc.id}`)}
                            className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            View
                          </button>
                          <RowActionsMenu
                            onEdit={() => handleEditDocument(doc)}
                            onDelete={() => void handleDeleteDocument(doc)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>

        <div className="shrink-0">
        <PaginationBar
          page={activeDocs.page}
          pageSize={5}
          total={totalItems}
          onPageChange={activeDocs.setPage}
          entriesLabel="documents"
        />
        </div>
      </div>
    </div>
  );
}
