"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  Download,
  LibraryBig,
} from "lucide-react";
import {
  RESOURCE_ACCESS_LEVELS,
  RESOURCE_ACCESS_STYLE,
  RESOURCE_CATEGORIES,
  RESOURCE_TYPE_STYLE,
  RESOURCE_TYPES,
  exportResourcesCsv,
  listResources,
  resourceItems as seed,
  type ResourceAccess,
  type ResourceCategory,
  type ResourceItem,
  type ResourceType,
} from "@/lib/resources/types";
import { cn } from "@/lib/utils";

export default function ResourcesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ResourceItem[]>(seed);
  const [typeFilter, setTypeFilter] = useState<ResourceType | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | "All">(
    "All",
  );
  const [accessFilter, setAccessFilter] = useState<ResourceAccess | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listResources());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, categoryFilter, accessFilter, search]);

  const filtered = useMemo(() => {
    let data = rows;
    if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
    if (categoryFilter !== "All")
      data = data.filter((r) => r.category === categoryFilter);
    if (accessFilter !== "All")
      data = data.filter((r) => r.accessLevel === accessFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.resourceId.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.uploadedBy.toLowerCase().includes(q) ||
          r.fileOrUrl.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, typeFilter, categoryFilter, accessFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const typeCounts = useMemo(() => {
    const map = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0])) as Record<
      ResourceType,
      number
    >;
    for (const r of rows) map[r.type] += 1;
    return map;
  }, [rows]);

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
              Resources
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <LibraryBig className="h-2.5 w-2.5" />
              §16
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportResourcesCsv(filtered)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export list
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/resources/create?layoutid=standard&redirect=false")
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload resource
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              typeFilter === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                typeFilter === t
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {t} {typeCounts[t]}
            </button>
          ))}
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ResourceCategory | "All")
            }
            className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All categories</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={accessFilter}
            onChange={(e) =>
              setAccessFilter(e.target.value as ResourceAccess | "All")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All access</option>
            {RESOURCE_ACCESS_LEVELS.map((a) => (
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
              placeholder="Search name, tags, description…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Resource</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Access</th>
                <th className="px-3 py-2.5">Uploaded by</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/resources/${r.id}`)}
                  className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {r.resourceId}
                    </div>
                    <div className="text-[11px] text-slate-700">{r.name}</div>
                    {r.tags.length ? (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        RESOURCE_TYPE_STYLE[r.type],
                      )}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.category}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        RESOURCE_ACCESS_STYLE[r.accessLevel],
                      )}
                    >
                      {r.accessLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.uploadedBy}</td>
                  <td className="px-3 py-3 text-slate-600">{r.uploadDate}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {r.downloadCount}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No resources match
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
