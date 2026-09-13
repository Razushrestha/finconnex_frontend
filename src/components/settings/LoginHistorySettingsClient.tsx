"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listAuditLogs,
  listAuthSecurityEvents,
  type AuditLogRow,
} from "@/lib/audit-logs/api";

const AUTH_HINT = /login|logout|2fa|session|auth|password/i;

/** Settings → Security → Login History */
export function LoginHistorySettingsClient() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.allSettled([
      listAuthSecurityEvents({ limit: 80 }),
      listAuditLogs({ limit: 80 }),
    ]).then(([security, workspace]) => {
      const securityRows =
        security.status === "fulfilled" ? security.value.items : [];
      const workspaceRows =
        workspace.status === "fulfilled" ? workspace.value.items : [];
      const hinted = workspaceRows.filter(
        (row) =>
          AUTH_HINT.test(row.action) ||
          AUTH_HINT.test(row.entityType) ||
          AUTH_HINT.test(row.summary),
      );
      const merged = [...securityRows, ...(hinted.length ? hinted : [])];
      merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      setRows(merged);
      if (!merged.length && security.status === "rejected" && workspace.status === "rejected") {
        const err = security.reason;
        setError(err instanceof Error ? err.message : "Could not load login history");
        return;
      }
      setError(null);
    });
  }, []);

  function exportCsv() {
    const header = "At,Action,Actor,Summary,IP";
    const body = rows
      .map((r) =>
        [r.createdAt, r.action, r.actor, r.summary, r.ip]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([[header, body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900">Login history</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Failed logins from GET /v1/audit-logs/auth-security-events plus
            workspace audit. Full trail also on{" "}
            <Link
              href="/settings/security/audit-logs"
              className="font-semibold text-violet-600"
            >
              Audit logs
            </Link>
            .
          </p>
          {error ? (
            <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700"
        >
          Export CSV
        </button>
      </div>
      <ul className="divide-y divide-slate-50">
        {rows.length === 0 && !error ? (
          <li className="px-5 py-10 text-center text-[12px] text-slate-400">
            No login events yet.
          </li>
        ) : (
          rows.slice(0, 80).map((e) => (
            <li key={e.id} className="px-5 py-3 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-800">
                  {e.action} · {e.actor}
                </p>
                <span className="text-[11px] text-slate-400">
                  {e.createdAt
                    ? new Date(e.createdAt).toLocaleString("en-AU")
                    : "—"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{e.summary}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {e.ip || "—"}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
