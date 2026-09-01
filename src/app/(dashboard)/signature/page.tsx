"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signatureRequests as seed,
  listSignatureRequests,
  type SignatureRequest,
  deleteSignatureRequest,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import {
  deleteCrmSignatureRequest,
  isCrmSignatureRequestId,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { useCrmSignatureRequests } from "@/lib/documents/signature/use-crm-signature-requests";
import { RecentTabsHeader } from "@/components/documents/signature/overview/RecentTabsHeader";
import SignatureStatsGrid from "@/components/documents/signature/overview/SignatureStatsGrid";
import {
  FileText,
  MoreVertical,
  CheckCircle2,
  Clock,
  CalendarX2,
  FileCode2,
  Pencil,
  Trash2,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ESignatureHeader } from "@/components/documents/signature/ESignatureHeader";
import { Tooltip } from "@/components/ui/tooltip";
import { useDataTable } from "@/hooks/useDataTable";

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

const TPL_DEFAULT_WIDTHS = {
  name: 240,
  description: 300,
  lastUpdated: 130,
  createdBy: 160,
  action: 140,
};

const TPL_MIN_WIDTHS = {
  name: 160,
  description: 180,
  lastUpdated: 100,
  createdBy: 120,
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

// Small reusable row-actions dropdown (Edit / Delete) shared by both
// the documents table and the templates table.
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
  const [activeTab, setActiveTab] = useState<"documents" | "templates">(
    "documents",
  );

  // Source data lives in local state now (instead of being handed to
  // useDataTable once) so edit/delete can mutate it and have the table
  // re-sync via the effects below.
  const [docsSource, setDocsSource] = useState<SignatureRequest[]>(
    seed.filter((doc) => doc.recordType !== "template"),
  );
  const [tplsSource, setTplsSource] = useState<SignatureRequest[]>(
    seed.filter((doc) => doc.recordType === "template"),
  );

  const documentsTable = useDataTable<SignatureRequest>({
    data: docsSource,
    defaultWidths: DOC_DEFAULT_WIDTHS,
    minWidths: DOC_MIN_WIDTHS,
    pageSize: 5,
    searchFilterFn: () => true, // no search on this page — table just lists recent items
  });

  const templatesTable = useDataTable<SignatureRequest>({
    data: tplsSource,
    defaultWidths: TPL_DEFAULT_WIDTHS,
    minWidths: TPL_MIN_WIDTHS,
    pageSize: 5,
    searchFilterFn: () => true,
  });

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => {
      const all = listSignatureRequests();
      setDocsSource(all.filter((doc) => doc.recordType !== "template"));
      setTplsSource(all.filter((doc) => doc.recordType === "template"));
    };
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  useEffect(() => {
    documentsTable.setItems(docsSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsSource]);

  useEffect(() => {
    templatesTable.setItems(tplsSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplsSource]);

  function handleEditDocument(doc: SignatureRequest) {
    router.push(`/signature/${doc.id}/edit`);
  }

  function handleDeleteDocument(doc: SignatureRequest) {
    if (
      !window.confirm(
        `Delete "${doc.documentName}"? This action can't be undone.`,
      )
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

  function handleEditTemplate(tpl: SignatureRequest) {
    router.push(`/signature/templates/${tpl.id}/edit`);
  }

  function handleDeleteTemplate(tpl: SignatureRequest) {
    if (
      !window.confirm(
        `Delete template "${tpl.documentName}"? This action can't be undone.`,
      )
    )
      return;
    // TODO(api): DELETE /api/signature-templates/{id}
    console.log("delete signature template", tpl.id);
    setTplsSource((prev) => prev.filter((t) => t.id !== tpl.id));
  }

  const activeDocs = documentsTable;
  const activeTpls = templatesTable;

  const totalItems =
    activeTab === "documents"
      ? activeDocs.filteredTotal
      : activeTpls.filteredTotal;

  if (!documentsTable.isMounted || !templatesTable.isMounted) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 pb-3">
      <div className="shrink-0">
        <ESignatureHeader />
      </div>

      <div className="mt-4 shrink-0">
        <SignatureStatsGrid />
      </div>

      {/* Main Content Table Section */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="shrink-0">
          <RecentTabsHeader
            onTabChange={(tab) => {
              setActiveTab(tab);
              documentsTable.setPage(1);
              templatesTable.setPage(1);
            }}
          />
        </div>

        {/* Table View */}
        <div
          ref={
            activeTab === "documents"
              ? activeDocs.containerRef
              : activeTpls.containerRef
          }
          className="relative min-h-0 flex-1 overflow-auto"
        >
          {/* Active Resize Indicator Line */}
          {(activeTab === "documents"
            ? activeDocs.resizeLineX
            : activeTpls.resizeLineX) !== null && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-violet-500 z-30 pointer-events-none"
              style={{
                left: `${
                  activeTab === "documents"
                    ? activeDocs.resizeLineX
                    : activeTpls.resizeLineX
                }px`,
              }}
            />
          )}

          {activeTab === "documents" ? (
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
                      <div
                        onMouseDown={activeDocs.onMouseDown(key)}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeDocs.activeResizeKey === key
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
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
                              Draft
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 ring-2 ring-white dark:ring-zinc-950">
                              JS
                            </span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 ring-2 ring-white dark:ring-zinc-950">
                              SL
                            </span>
                          </div>
                          <Tooltip
                            content={doc.signer || "john.smith@email.com"}
                            fullWidth
                          >
                            <span className="block truncate text-slate-500">
                              {doc.signer || "john.smith@email.com"}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold dark:bg-zinc-800 dark:text-zinc-300">
                            F
                          </div>
                          <Tooltip content="Finconnex" fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              Finconnex
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tooltip
                          content={doc.relatedTo || "Lead: William Anderson"}
                          fullWidth
                        >
                          <span className="block truncate font-medium text-slate-900 dark:text-white">
                            {doc.relatedTo || "Lead: William Anderson"}
                          </span>
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
                        <Tooltip content="12 Aug 2025" fullWidth>
                          <span className="block truncate">12 Aug 2025</span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content="2 hours ago" fullWidth>
                          <span className="block truncate">2 hours ago</span>
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
                            onDelete={() => handleDeleteDocument(doc)}
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
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: activeTpls.widths.name }} />
                <col style={{ width: activeTpls.widths.description }} />
                <col style={{ width: activeTpls.widths.lastUpdated }} />
                <col style={{ width: activeTpls.widths.createdBy }} />
                <col style={{ width: activeTpls.widths.action }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
                  {(
                    [
                      ["name", "Template Name"],
                      ["description", "Description"],
                      ["lastUpdated", "Last Updated"],
                      ["createdBy", "Created By"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="group relative select-none py-3 px-4"
                    >
                      {label}
                      <div
                        onMouseDown={activeTpls.onMouseDown(key)}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeTpls.activeResizeKey === key
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right select-none">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
                {activeTpls.paginatedItems.length > 0 ? (
                  activeTpls.paginatedItems.map((tpl) => (
                    <tr
                      key={tpl.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                            <FileCode2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={tpl.documentName} fullWidth>
                              <div className="truncate font-semibold text-slate-900 dark:text-white">
                                {tpl.documentName}
                              </div>
                            </Tooltip>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
                              {tpl.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content={tpl.documentFile} fullWidth>
                          <span className="block truncate">
                            {tpl.documentFile}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content="—" fullWidth>
                          <span className="block truncate">—</span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {initialsFor(tpl.createdBy)}
                          </span>
                          <Tooltip content={tpl.createdBy} fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              {tpl.createdBy}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(`/signature/templates/${tpl.id}`)
                            }
                            className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            Use
                          </button>
                          <RowActionsMenu
                            onEdit={() => handleEditTemplate(tpl)}
                            onDelete={() => handleDeleteTemplate(tpl)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No templates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0">
          <PaginationBar
            page={activeTab === "documents" ? activeDocs.page : activeTpls.page}
            pageSize={5}
            total={totalItems}
            onPageChange={(p) =>
              activeTab === "documents"
                ? activeDocs.setPage(p)
                : activeTpls.setPage(p)
            }
            entriesLabel={activeTab === "documents" ? "documents" : "templates"}
          />
        </div>
      </div>
    </div>
  );
}
