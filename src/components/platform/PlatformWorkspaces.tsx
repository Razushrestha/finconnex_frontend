"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  enterWorkspace,
  listAdminWorkspaces,
  type AdminWorkspace,
} from "@/lib/admin/api";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (s === "SUSPENDED" || s === "DISABLED") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export function PlatformWorkspaces() {
  const [items, setItems] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const limit = 20;

  const refresh = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminWorkspaces({ page: p, limit, search: q });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load workspaces",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(query, page);
  }, [refresh, query, page]);

  async function enter(row: AdminWorkspace) {
    if (
      !window.confirm(
        `Enter ${row.name}? You will leave the platform console and open this tenant’s CRM.`,
      )
    ) {
      return;
    }
    setEntering(row.id);
    setError(null);
    try {
      await enterWorkspace({ id: row.id, name: row.name, slug: row.slug });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enter workspace");
      setEntering(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Workspaces</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every tenant on this CRM. Entering a row selects that workspace on
            the access token — it does not grant cross-tenant data on one
            screen.
          </p>
        </div>
        <form
          className="relative w-full sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or slug"
            className="h-11 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-sm outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
          />
        </form>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-sm shadow-slate-200/60">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Workspace</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Members</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                    No workspaces match this search.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-violet-50/40">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">
                        {row.slug}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(row.status)}`}
                      >
                        {row.status || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.plan || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.memberCount ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {row.createdAt ? formatWhen(row.createdAt) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        disabled={entering === row.id}
                        onClick={() => void enter(row)}
                        className="inline-flex h-9 items-center rounded-full bg-[#5A32A3] px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-[#5A32A3]/25 hover:brightness-95 disabled:opacity-50"
                      >
                        {entering === row.id ? "Entering…" : "Enter"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
          <span>
            {total} workspace{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full px-3 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-1 py-1">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full px-3 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
