"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listAuditLogs,
  type AuditLogRow,
} from "@/lib/audit-logs/api";

function formatWhen(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Settings → Security → Audit Logs (`GET /v1/audit-logs`). */
export function AuditLogsSettingsClient() {
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (q: string) => {
    setError(null);
    const page = await listAuditLogs({ page: 1, limit: 50, search: q });
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
            err instanceof Error ? err.message : "Could not load audit logs",
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
        <h2 className="text-[16px] font-bold text-slate-900">Audit logs</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Live CRM trail from GET /v1/audit-logs. Sign in with a workspace-scoped
          session to load rows.
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
          placeholder="Search action, actor, or entity"
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
          Loading audit logs…
        </p>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">
          No audit logs returned.
        </p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">
                  {row.action}
                </p>
                <p className="text-[11px] text-slate-500">
                  {row.actor}
                  {row.entityType !== "—" ? ` · ${row.entityType}` : ""}
                  {row.entityId ? ` ${row.entityId}` : ""}
                </p>
                {row.summary && row.summary !== row.action ? (
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {row.summary}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p>{formatWhen(row.createdAt)}</p>
                {row.ip ? <p className="font-mono text-slate-400">{row.ip}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
