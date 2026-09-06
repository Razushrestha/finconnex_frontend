"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FolderPlus, Search, X } from "lucide-react";
import { REPORT_CATEGORIES, reportsForCategory } from "@/lib/reports/library/catalog";
import {
  createReportFolder,
  isDefaultFolder,
  renameReportFolder,
  setFolderReports,
} from "@/lib/reports/library/prefs";
import type { ReportFolder } from "@/lib/reports/library/types";
import { cn } from "@/lib/utils";

export function FolderEditor({
  folder,
  onClose,
  onSaved,
}: {
  folder?: ReportFolder | null;
  onClose: () => void;
  onSaved: (folder: ReportFolder) => void;
}) {
  const lockedName = Boolean(folder && isDefaultFolder(folder.id));
  const [name, setName] = useState(folder?.name ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(folder?.reportIds ?? []);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const categories = useMemo(() => {
    return REPORT_CATEGORIES.map((category) => {
      const reports = reportsForCategory(category.id).filter(
        (report) =>
          !q ||
          report.name.toLowerCase().includes(q) ||
          report.purpose.toLowerCase().includes(q) ||
          category.name.toLowerCase().includes(q),
      );
      return { category, reports };
    }).filter((row) => row.reports.length > 0);
  }, [q]);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((item) => item !== id) : [...cur, id]));
  }

  function toggleCategory(ids: string[]) {
    setSelected((cur) => {
      const allOn = ids.every((id) => cur.includes(id));
      return allOn ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])];
    });
  }

  function save() {
    if (folder) {
      setFolderReports(folder.id, selected);
      onSaved(renameReportFolder(folder.id, name) ?? folder);
      return;
    }
    onSaved(createReportFolder(name, selected));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-[#5A32A3]" />
            <h2 className="text-[15px] font-semibold text-slate-900">
              {folder ? (lockedName ? "Add reports" : "Edit folder") : "New folder"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            disabled={lockedName}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-500"
          />
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenId(null);
              }}
              placeholder="Find a category or report…"
              className="h-9 w-full rounded-xl border border-slate-200 pr-3 pl-8 text-[12px] outline-none"
            />
          </label>
          <p className="text-[12px] text-slate-500">{selected.length} selected</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100">
          {categories.map(({ category, reports }) => {
            const open = openId === category.id || Boolean(q);
            const ids = reports.map((r) => r.id);
            const picked = ids.filter((id) => selected.includes(id)).length;
            return (
              <div key={category.id} className="border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenId(open && !q ? null : category.id)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                  <span className="flex-1 text-[13px] font-semibold text-slate-900">{category.name}</span>
                  <span className="text-[11px] text-slate-400">
                    {picked ? `${picked} selected · ` : ""}
                    {reports.length} reports
                  </span>
                </button>
                {open ? (
                  <div className="bg-slate-50/70 pb-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(ids)}
                      className="px-10 pb-1 text-[11px] font-semibold text-[#5A32A3]"
                    >
                      {ids.every((id) => selected.includes(id)) ? "Clear category" : "Add all in category"}
                    </button>
                    {reports.map((report) => (
                      <label
                        key={report.id}
                        className="flex cursor-pointer items-start gap-3 px-10 py-2 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(report.id)}
                          onChange={() => toggle(report.id)}
                          className="mt-0.5 accent-[#5A32A3]"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-slate-900">{report.name}</span>
                          <span className="block text-[11px] text-slate-500">{report.purpose}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" onClick={onClose} className="h-8 rounded-lg px-3 text-[12px] font-semibold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="h-8 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white"
          >
            {folder ? "Save folder" : "Create folder"}
          </button>
        </div>
      </div>
    </div>
  );
}
