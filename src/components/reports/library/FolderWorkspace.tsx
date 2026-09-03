"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Folder, Pencil, Star, Trash2 } from "lucide-react";
import { reportById } from "@/lib/reports/library/catalog";
import {
  deleteReportFolder,
  formatLastAccessed,
  getReportFolder,
  isDefaultFolder,
  listReportFolders,
  removeReportFromFolder,
} from "@/lib/reports/library/prefs";
import { FolderEditor } from "@/components/reports/library/FolderEditor";

export function FolderWorkspace({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [folder, setFolder] = useState(() => getReportFolder(folderId));

  if (!folder) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Folder not found. <Link href="/reports" className="text-[#5A32A3] underline">Back to reports</Link>
      </div>
    );
  }

  const reports = folder.reportIds.map((id) => reportById(id)).filter(Boolean);

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link href="/reports" className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
              {isDefaultFolder(folder.id) ? (
                <Star className="h-4 w-4 fill-[#5A32A3]" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
            </span>
            <div>
              <h1 className="text-[20px] font-semibold text-slate-900">{folder.name}</h1>
              <p className="text-[12px] text-slate-500">
                {reports.length} selected report{reports.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isDefaultFolder(folder.id) ? "Add reports" : "Edit"}
            </button>
            {isDefaultFolder(folder.id) ? null : (
              <button
                type="button"
                onClick={() => {
                  deleteReportFolder(folder.id);
                  router.push("/reports");
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {reports.length ? (
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Report</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Last accessed date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report!.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/reports/library/${report!.category}/${report!.id}`}
                        className="font-semibold text-slate-900 hover:text-[#5A32A3]"
                      >
                        {report!.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{report!.purpose}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {formatLastAccessed(report!.id)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          removeReportFromFolder(folder.id, report!.id);
                          setFolder(getReportFolder(folder.id));
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-10 text-center text-[13px] text-slate-400">
              {isDefaultFolder(folder.id)
                ? "Pin a report from any category list, or add reports here."
                : "No reports in this folder yet. Edit the folder to add some."}
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <FolderEditor
          folder={folder}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setFolder(listReportFolders().find((item) => item.id === folder.id) ?? folder);
            setEditing(false);
          }}
        />
      ) : null}
    </div>
  );
}
