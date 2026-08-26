"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
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

/** Settings → Users & Access → Workspaces (platform admin). */
export function WorkspacesSettingsClient() {
  const [items, setItems] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (q: string) => {
    setError(null);
    const page = await listAdminWorkspaces({ page: 1, limit: 50, search: q });
    setItems(page.items);
    setTotal(page.total);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh("");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load workspaces (admin only)",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await refresh(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">Workspaces</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Platform admin list of every CRM workspace.
        </p>
        {error ? (
          <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
        ) : null}
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or slug"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          className="h-9 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
        >
          Search
        </button>
        <span className="text-[11px] text-slate-400">{total} total</span>
      </form>

      {loading && items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">
          Loading workspaces…
        </p>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">
          No workspaces returned.
        </p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {items.map((ws) => (
            <li
              key={ws.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">
                  {ws.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {ws.slug} · {ws.plan} · {ws.memberCount} members
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">{ws.status}</p>
                <p>{formatWhen(ws.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
