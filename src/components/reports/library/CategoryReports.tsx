"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pin, Star } from "lucide-react";
import { AddToFolderMenu } from "@/components/reports/library/AddToFolderMenu";
import { categoryById, reportsForCategory } from "@/lib/reports/library/catalog";
import {
  formatLastAccessed,
  listFavoriteReportIds,
  listPinnedReportIds,
  sortReportsWithPins,
  toggleFavoriteReport,
  togglePinnedReport,
} from "@/lib/reports/library/prefs";
import type { ReportCategoryId } from "@/lib/reports/library/types";
import { cn } from "@/lib/utils";

export function CategoryReports({ categoryId }: { categoryId: string }) {
  const category = categoryById(categoryId);
  const [pinned, setPinned] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setPinned(listPinnedReportIds());
    setFavorites(listFavoriteReportIds());
  }, []);

  if (!category) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Unknown category. <Link href="/reports" className="text-[#5A32A3] underline">Back to reports</Link>
      </div>
    );
  }
  const reports = sortReportsWithPins(
    reportsForCategory(category.id as ReportCategoryId),
    pinned,
  );

  function refresh() {
    setPinned(listPinnedReportIds());
    setFavorites(listFavoriteReportIds());
  }

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link href="/reports" className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">{category.name}</h1>
          <p className="mt-1 text-[13px] text-slate-500">{category.description}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="w-20 px-4 py-2.5" />
                <th className="px-4 py-2.5">Report</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Last accessed date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const isPinned = pinned.includes(report.id);
                const isFavorite = favorites.includes(report.id);
                return (
                  <tr key={report.id} className="border-t border-slate-50 hover:bg-violet-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title={isPinned ? "Unpin from top" : "Pin to top"}
                          onClick={() => {
                            togglePinnedReport(report.id);
                            refresh();
                          }}
                          className="rounded-md p-1 hover:bg-white"
                        >
                          <Pin
                            className={cn(
                              "h-3.5 w-3.5",
                              isPinned ? "fill-[#5A32A3] text-[#5A32A3]" : "text-slate-300",
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          title={isFavorite ? "Remove from My Favourites" : "Add to My Favourites"}
                          onClick={() => {
                            toggleFavoriteReport(report.id);
                            refresh();
                          }}
                          className="rounded-md p-1 hover:bg-white"
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-300",
                            )}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reports/library/${category.id}/${report.id}`}
                        className="font-semibold text-slate-900 hover:text-[#5A32A3]"
                      >
                        {report.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{report.purpose}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {formatLastAccessed(report.id)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AddToFolderMenu
                        reportId={report.id}
                        refreshKey={favorites.join("|")}
                        onAdded={refresh}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
