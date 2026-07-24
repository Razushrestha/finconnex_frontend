"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Link2, Plus, Search, ExternalLink } from "lucide-react";
import {
  LINKTREE_STATUSES,
  linktreePages as seed,
  listLinktreePages,
  type LinktreePage,
  type LinktreeStatus,
} from "@/lib/marketing/linktree/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<LinktreeStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Live: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
};

export default function LinktreeListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LinktreePage[]>(seed);
  const [statusTab, setStatusTab] = useState<LinktreeStatus | "All">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRows(listLinktreePages());
  }, []);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.displayName ?? "").toLowerCase().includes(q) ||
          r.pageId.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Marketing</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Broker pages
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Link2 className="h-2.5 w-2.5" />
              §22
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                "/marketing/linktree/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New page
          </button>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-slate-50 p-0.5">
              {(["All", ...LINKTREE_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusTab(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    statusTab === s
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-44 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[800px] text-left text-[12px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Page</th>
                  <th className="px-4 py-2.5">Public URL</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Links</th>
                  <th className="px-4 py-2.5">Views</th>
                  <th className="px-4 py-2.5">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-violet-50/40"
                    onClick={() => router.push(`/marketing/linktree/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {p.displayName || p.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {p.pageId}
                        {p.role ? ` · ${p.role}` : ""}
                        {p.bookingSlug ? " · booking" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/l/${p.slug}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-700 hover:underline"
                      >
                        /l/{p.slug}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_STYLE[p.status],
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.links}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.owner}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-slate-400"
                    >
                      No link pages match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
