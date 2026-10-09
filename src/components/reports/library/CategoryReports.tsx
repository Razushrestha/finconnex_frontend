"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pin,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { AddToFolderMenu } from "@/components/reports/library/AddToFolderMenu";
import { FINANCE_PRIMARY_BUTTON_SM } from "@/components/finance/buttonStyles";
import { categoryById, reportsForCategory } from "@/lib/reports/library/catalog";
import {
  CATEGORY_DATA_SOURCE,
  CATEGORY_REPORT_TYPE,
} from "@/lib/reports/library/live";
import { useReportLibraryLive } from "@/lib/reports/library/use-live-sources";
import {
  formatLastAccessed,
  listFavoriteReportIds,
  listPinnedReportIds,
  sortReportsWithPins,
  toggleFavoriteReport,
  togglePinnedReport,
} from "@/lib/reports/library/prefs";
import type { ReportCategoryId } from "@/lib/reports/library/types";
import {
  deleteCrmReport,
  isCrmReportId,
  runCrmReport,
} from "@/lib/reports/api";
import { labelForDataSource } from "@/lib/reports/catalog";
import { useCrmReports } from "@/lib/reports/use-crm-reports";
import { confirmDialog } from "@/lib/notify/dialog";
import {
  REPORT_TYPE_STYLE,
  deleteReport,
  listReports,
  type SavedReport,
} from "@/lib/reports/types";
import { cn } from "@/lib/utils";

export function CategoryReports({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const category = categoryById(categoryId);
  const crm = useCrmReports();
  const live = useReportLibraryLive(category?.id ?? categoryId);
  const [pinned, setPinned] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPinned(listPinnedReportIds());
    setFavorites(listFavoriteReportIds());
  }, []);

  useEffect(() => {
    setSaved(listReports());
  }, [crm.source, crm.loading]);

  const typed = category ? CATEGORY_REPORT_TYPE[category.id as ReportCategoryId] : "Custom";
  const source = category ? CATEGORY_DATA_SOURCE[category.id as ReportCategoryId] : "leads";

  const reports = useMemo(() => {
    if (!category) return [];
    const rows = sortReportsWithPins(
      reportsForCategory(category.id as ReportCategoryId),
      pinned,
    );
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (report) =>
        report.name.toLowerCase().includes(q) ||
        report.purpose.toLowerCase().includes(q),
    );
  }, [category, pinned, search]);

  const savedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return saved.filter((row) => {
      const matchesType =
        typed === "Custom"
          ? row.type === "Custom" && row.dataSource === source
          : row.type === typed;
      if (!matchesType) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.reportId.toLowerCase().includes(q) ||
        row.createdBy.toLowerCase().includes(q)
      );
    });
  }, [saved, search, typed, source]);

  if (!category) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Unknown category.{" "}
        <Link href="/reports" className="text-[var(--brand-primary)] underline">
          Back to reports
        </Link>
      </div>
    );
  }

  function refreshPins() {
    setPinned(listPinnedReportIds());
    setFavorites(listFavoriteReportIds());
  }

  async function onRun(row: SavedReport) {
    if (!isCrmReportId(row.id)) {
      router.push(`/reports/${row.id}`);
      return;
    }
    setBusyId(row.id);
    setNotice(null);
    try {
      await runCrmReport(row.id);
      crm.refresh();
      setNotice(`${row.name} finished.`);
      router.push(`/reports/${row.id}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The report could not be run.");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(row: SavedReport) {
    if (
      !(await confirmDialog({
        title: "Delete report?",
        message: `Delete ${row.name}?`,
        confirmText: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }
    setBusyId(row.id);
    setNotice(null);
    try {
      if (isCrmReportId(row.id)) await deleteCrmReport(row.id);
      deleteReport(row.id);
      crm.refresh();
      setSaved(listReports().filter((item) => item.id !== row.id));
      setNotice(`${row.name} deleted.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The report could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-full bg-[#F5F7FB]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/reports"
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Report library
          </Link>
          <div className="ml-auto flex items-center justify-end gap-2">
            <label className="relative block w-56 shrink">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports"
                className="h-9 w-full rounded-full border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-300"
              />
            </label>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                live.live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
              )}
            >
              {live.loading ? "Loading CRM data" : live.live ? "Live CRM" : "Workspace data"}
            </span>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/reports/create?layoutid=standard&redirect=false&type=${typed}&source=${source}`,
                )
              }
              className={`${FINANCE_PRIMARY_BUTTON_SM} shrink-0`}
            >
              <Plus className="h-3.5 w-3.5" />
              New report
            </button>
          </div>
        </div>

        {notice ? <p className="text-[12px] font-medium text-slate-600">{notice}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const isPinned = pinned.includes(report.id);
            const isFavorite = favorites.includes(report.id);
            return (
              <article
                key={report.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/reports/library/${category.id}/${report.id}`}
                    className="text-[14px] font-semibold text-slate-900 hover:text-[var(--brand-primary)]"
                  >
                    {report.name}
                  </Link>
                  <div className="flex items-center">
                    <button
                      type="button"
                      title={isPinned ? "Unpin" : "Pin to top"}
                      onClick={() => {
                        togglePinnedReport(report.id);
                        refreshPins();
                      }}
                      className="rounded-md p-1 hover:bg-slate-50"
                    >
                      <Pin
                        className={cn(
                          "h-3.5 w-3.5",
                          isPinned ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-slate-300",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      title={isFavorite ? "Remove from My Favourites" : "Add to My Favourites"}
                      onClick={() => {
                        toggleFavoriteReport(report.id);
                        refreshPins();
                      }}
                      className="rounded-md p-1 hover:bg-slate-50"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-300",
                        )}
                      />
                    </button>
                  </div>
                </div>
                <p className="mt-2 min-h-[40px] text-[12px] leading-5 text-slate-500">{report.purpose}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-[11px] text-slate-400">{formatLastAccessed(report.id)}</span>
                  <div className="flex items-center gap-1">
                    <AddToFolderMenu reportId={report.id} refreshKey={favorites.join("|")} onAdded={refreshPins} />
                    <Link
                      href={`/reports/library/${category.id}/${report.id}`}
                      className="rounded-full bg-[var(--brand-primary)] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[var(--brand-primary-strong)]"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!reports.length ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
            No library reports match this search.
          </p>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-900">Saved reports</h2>
              <p className="text-[12px] text-slate-500">
                {typed} reports stored in the CRM. Run, open, or delete them here.
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {crm.loading ? "Loading" : `${savedRows.length} saved`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[12px]">
              <thead className="bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Report ID</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Data source</th>
                  <th className="px-4 py-2.5">Date range</th>
                  <th className="px-4 py-2.5">Schedule</th>
                  <th className="px-4 py-2.5">Created by</th>
                  <th className="px-4 py-2.5">Last run</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {savedRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-500">{row.reportId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/reports/${row.id}`} className="font-semibold text-slate-900 hover:text-[var(--brand-primary)]">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", REPORT_TYPE_STYLE[row.type])}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{labelForDataSource(row.dataSource)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.dateRange}</td>
                    <td className="px-4 py-3 text-slate-600">{row.schedule}</td>
                    <td className="px-4 py-3 text-slate-600">{row.createdBy || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.lastRunAt || "Never"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void onRun(row)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Play className="h-3 w-3" />
                          Run
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void onDelete(row)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-rose-100 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!savedRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-slate-400">
                      No saved {typed.toLowerCase()} reports yet. Create one to schedule, export, share, or email it.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
