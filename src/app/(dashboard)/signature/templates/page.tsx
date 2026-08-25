"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutTemplate,
  Plus,
  MoreVertical,
  FileCode2,
  Edit,
  Trash2,
} from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDataTable } from "@/hooks/useDataTable";
import { Tooltip } from "@/components/ui/tooltip";
import {
  listSignatureRequests,
  deleteSignatureRequest,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  status: string;
  lastUpdated: string;
  createdBy: { name: string; initials: string };
}

const DEFAULT_WIDTHS = {
  name: 280,
  description: 340,
  lastUpdated: 140,
  createdBy: 160,
  action: 120,
};

const MIN_WIDTHS = {
  name: 180,
  description: 200,
  lastUpdated: 100,
  createdBy: 120,
  action: 100,
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

function formatLastUpdated(req: SignatureRequest): string {
  const raw = req.updatedAt;
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapToTemplateItem(req: SignatureRequest): TemplateItem {
  const creatorName = req.createdBy || "Current User";
  return {
    id: req.id,
    name: req.documentName || "Untitled Template",
    description: `File: ${req.documentFile || "N/A"} • Recipient(s): ${req.signers?.length || 0}`,
    status: req.status,
    lastUpdated: formatLastUpdated(req),
    createdBy: { name: creatorName, initials: initialsFor(creatorName) },
  };
}

export default function SignatureTemplatesPage() {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [loadedTemplates, setLoadedTemplates] = useState<TemplateItem[]>([]);

  const refreshTemplates = () => {
    try {
      const allRequests = listSignatureRequests();
      const templateItems = allRequests
        .filter((req) => req.recordType === "template")
        .map(mapToTemplateItem);
      setLoadedTemplates(templateItems);
    } catch (error) {
      console.error("Failed to load templates from local storage:", error);
    }
  };

  useEffect(() => {
    refreshTemplates();
  }, []);

  const {
    isMounted,
    setItems: setTemplates,
    searchQuery: search,
    setSearchQuery: setSearch,
    page,
    setPage,
    paginatedItems: paginatedTemplates,
    filteredTotal,
    pageSize,
    widths,
    onMouseDown,
    resizeLineX,
    containerRef,
    activeResizeKey,
  } = useDataTable<TemplateItem>({
    data: loadedTemplates,
    defaultWidths: DEFAULT_WIDTHS,
    minWidths: MIN_WIDTHS,
    pageSize: 10,
    searchFilterFn: (tpl, query) =>
      tpl.name.toLowerCase().includes(query.toLowerCase()) ||
      tpl.description.toLowerCase().includes(query.toLowerCase()),
  });

  // Keep table items synced when loadedTemplates updates
  useEffect(() => {
    setTemplates(loadedTemplates);
  }, [loadedTemplates, setTemplates]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emptyRowsCount = Math.max(0, pageSize - paginatedTemplates.length);

  const handleEdit = (id: string) => {
    setOpenMenuId(null);
    router.push(`/signature/templates/create?id=${id}`);
  };

  const handleDelete = (id: string) => {
    setOpenMenuId(null);
    deleteSignatureRequest(id);
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
  };

  if (!isMounted) return null;

  return (
    <div className="relative mx-auto flex w-full flex-col p-4 space-y-4">
      {/* Header & Controls Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Signature Templates
        </h1>

        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search templates..."
          />
          <button
            onClick={() => router.push("/signature/templates/create")}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>
      </div>

      <hr className="border-border" />

      {/* Content Table Container */}
      <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {filteredTotal > 0 ? (
          <>
            <div ref={containerRef} className="overflow-x-auto relative">
              {/* Active Resize Indicator Line */}
              {resizeLineX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-violet-500 z-30 pointer-events-none"
                  style={{ left: `${resizeLineX}px` }}
                />
              )}

              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 text-[13px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
                    <th
                      style={{ width: widths.name }}
                      className="group relative select-none truncate py-3 px-4"
                    >
                      Template Name
                      <div
                        onMouseDown={onMouseDown("name")}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeResizeKey === "name"
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                    <th
                      style={{ width: widths.description }}
                      className="group relative select-none truncate py-3 px-4"
                    >
                      Description
                      <div
                        onMouseDown={onMouseDown("description")}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeResizeKey === "description"
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                    <th
                      style={{ width: widths.lastUpdated }}
                      className="group relative select-none truncate py-3 px-4"
                    >
                      Last Updated
                      <div
                        onMouseDown={onMouseDown("lastUpdated")}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeResizeKey === "lastUpdated"
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                    <th
                      style={{ width: widths.createdBy }}
                      className="group relative select-none truncate py-3 px-4"
                    >
                      Created By
                      <div
                        onMouseDown={onMouseDown("createdBy")}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeResizeKey === "createdBy"
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                    <th
                      style={{ width: widths.action }}
                      className="group relative select-none truncate py-3 px-4"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-sm text-slate-700 dark:text-zinc-300">
                  {paginatedTemplates.map((tpl) => (
                    <tr
                      key={tpl.id}
                      className="h-[53px] hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      <td
                        style={{ width: widths.name }}
                        className="py-3.5 px-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                            <FileCode2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={tpl.name} fullWidth>
                              <Link
                                href={`/signature/templates/${tpl.id}`}
                                className="block truncate font-semibold text-slate-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-400 transition-colors"
                              >
                                {tpl.name}
                              </Link>
                            </Tooltip>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
                              {tpl.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{ width: widths.description }}
                        className="py-3.5 px-4 text-slate-500"
                      >
                        <Tooltip content={tpl.description} fullWidth>
                          <span className="block truncate">
                            {tpl.description}
                          </span>
                        </Tooltip>
                      </td>
                      <td
                        style={{ width: widths.lastUpdated }}
                        className="py-3.5 px-4 text-slate-500"
                      >
                        <Tooltip content={tpl.lastUpdated} fullWidth>
                          <span className="block truncate">
                            {tpl.lastUpdated}
                          </span>
                        </Tooltip>
                      </td>
                      <td
                        style={{ width: widths.createdBy }}
                        className="py-3.5 px-4"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {tpl.createdBy.initials}
                          </span>
                          <Tooltip content={tpl.createdBy.name} fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              {tpl.createdBy.name}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td
                        style={{ width: widths.action }}
                        className="py-3.5 px-4 text-right"
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/signature/documents/create?fromTemplate=${tpl.id}`,
                              )
                            }
                            className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            Use
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(
                                  openMenuId === tpl.id ? null : tpl.id,
                                );
                              }}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === tpl.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50 text-left"
                              >
                                <button
                                  onClick={() => handleEdit(tpl.id)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  <Edit className="h-3.5 w-3.5 text-slate-400" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(tpl.id)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {Array.from({ length: emptyRowsCount }).map((_, index) => (
                    <tr key={`empty-${index}`} className="h-[53px]">
                      <td colSpan={5} className="px-4 py-3.5">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={filteredTotal}
              onPageChange={(p) => setPage(p)}
              entriesLabel="templates"
            />
          </>
        ) : (
          <div className="p-12 text-center">
            <LayoutTemplate className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-700" />
            <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
              No Templates Available
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Create templates to automate standard workflow agreements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
