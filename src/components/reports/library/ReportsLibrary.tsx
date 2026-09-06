"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Crown,
  FileStack,
  Folder,
  FolderPlus,
  Handshake,
  Kanban,
  Megaphone,
  Star,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import {
  REPORT_CATEGORIES,
  reportById,
  reportsForCategory,
} from "@/lib/reports/library/catalog";
import {
  isFavoriteReport,
  listCustomFolders,
  listFavoriteReportIds,
  listRecentReportIds,
  MY_FAVOURITES_FOLDER_ID,
} from "@/lib/reports/library/prefs";
import type { ReportFolder } from "@/lib/reports/library/types";
import { FolderEditor } from "@/components/reports/library/FolderEditor";

const ICONS = {
  users: Users,
  handshake: Handshake,
  kanban: Kanban,
  activity: Activity,
  file: FileStack,
  megaphone: Megaphone,
  wallet: Wallet,
  trophy: Trophy,
  building: Building2,
  crown: Crown,
};

export function ReportsLibrary({
  crmSource,
}: {
  crmSource?: "api" | "demo";
  crmLoading?: boolean;
}) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setFavorites(listFavoriteReportIds());
    setRecent(listRecentReportIds());
    setFolders(listCustomFolders());
  }, []);

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {crmSource === "api" ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Live CRM
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#5A32A3] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#4a2788]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New folder
          </button>
        </div>

        {folders.length ? (
          <section>
            <h2 className="mb-2 text-[13px] font-semibold text-slate-800">Folders</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/reports/folders/${folder.id}`}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-violet-200 hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
                    <Folder className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-slate-900">{folder.name}</span>
                    <span className="text-[12px] text-slate-500">
                      {folder.reportIds.length} report{folder.reportIds.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {recent.length ? (
          <Rail title="Recently viewed" ids={recent} empty="Open a report and it will appear here." />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Link
            href={`/reports/folders/${MY_FAVOURITES_FOLDER_ID}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </span>
            <h3 className="mt-3 text-[14px] font-semibold text-slate-900">My Favourites</h3>
            <p className="mt-1 min-h-[40px] text-[12px] leading-5 text-slate-500">
              Reports you pin from any category.
            </p>
            <div className="mt-auto pt-3 text-[11px] text-slate-400">
              {favorites.length} report{favorites.length === 1 ? "" : "s"}
            </div>
          </Link>
          {REPORT_CATEGORIES.map((category) => {
            const reports = reportsForCategory(category.id);
            const Icon = ICONS[category.icon as keyof typeof ICONS] ?? Users;
            const last = recent.map((id) => reportById(id)).find((r) => r?.category === category.id);
            return (
              <Link
                key={category.id}
                href={`/reports/library/${category.id}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{category.name}</h3>
                <p className="mt-1 min-h-[40px] text-[12px] leading-5 text-slate-500">{category.description}</p>
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-slate-400">
                  <span>{reports.length} reports</span>
                  {last ? <span className="truncate pl-2 text-violet-700">Last: {last.name}</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {creating ? (
        <FolderEditor
          onClose={() => setCreating(false)}
          onSaved={() => {
            setFolders(listCustomFolders());
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Rail({ title, ids, empty }: { title: string; ids: string[]; empty: string }) {
  const router = useRouter();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
      {ids.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ids.slice(0, 6).map((id) => {
            const report = reportById(id);
            if (!report) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => router.push(`/reports/library/${report.category}/${report.id}`)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-violet-50"
              >
                {isFavoriteReport(id) ? <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> : null}
                {report.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-slate-400">{empty}</p>
      )}
    </section>
  );
}
