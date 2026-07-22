"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Plus, Search, Download, Globe } from "lucide-react";
import {
  PORTAL_ACCESS_LEVELS,
  PORTAL_ACCESS_STYLE,
  PORTAL_STATUS_STYLE,
  PORTAL_STATUSES,
  clientPortals as seed,
  exportPortalsCsv,
  listPortals,
  portalPublicPath,
  type ClientPortal,
  type PortalAccessLevel,
  type PortalStatus,
} from "@/lib/portals/types";
import { cn } from "@/lib/utils";

export default function PortalsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ClientPortal[]>(seed);
  const [statusTab, setStatusTab] = useState<PortalStatus | "All">("All");
  const [accessFilter, setAccessFilter] = useState<PortalAccessLevel | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listPortals());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, accessFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      PORTAL_STATUSES.map((s) => [s, 0]),
    ) as Record<PortalStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (accessFilter !== "All")
      data = data.filter((r) => r.accessLevel === accessFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.portalId.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.primaryContactName.toLowerCase().includes(q) ||
          r.primaryContactEmail.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, accessFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function exportCsv() {
    exportPortalsCsv(filtered);
  }

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
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Client Portal
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Globe className="h-2.5 w-2.5" />
              §12
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/portals/create?layoutid=standard&redirect=false")
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New portal
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusTab === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {PORTAL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusTab === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {counts[s]}
            </button>
          ))}
          <select
            value={accessFilter}
            onChange={(e) =>
              setAccessFilter(e.target.value as PortalAccessLevel | "All")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All access</option>
            {PORTAL_ACCESS_LEVELS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search portals…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Portal</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Access</th>
                <th className="px-3 py-2.5">Modules</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-4 py-2.5">Contact</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/portals/${r.id}`)}
                  className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.portalId}</div>
                    <div className="text-[11px] text-slate-500">{r.name}</div>
                    <div className="text-[10px] text-violet-600">
                      {portalPublicPath(r.slug)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.clientName}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        PORTAL_ACCESS_STYLE[r.accessLevel],
                      )}
                    >
                      {r.accessLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.modules.length}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        PORTAL_STATUS_STYLE[r.status],
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{r.primaryContactName}</div>
                    <div className="text-[10px] text-slate-400">
                      {r.primaryContactEmail}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No portals match
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
