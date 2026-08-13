"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAuditEvents, onRulesChange, type AuditEvent } from "@/lib/rules";

const AUTH_ACTIONS = new Set([
  "login",
  "logout",
  "login_failed",
  "2fa_success",
  "2fa_failed",
]);

/** Settings → Security → Login History */
export function LoginHistorySettingsClient() {
  const [rows, setRows] = useState<AuditEvent[]>([]);

  function refresh() {
    setRows(
      listAuditEvents().filter(
        (e) => e.module === "auth" || AUTH_ACTIONS.has(e.action),
      ),
    );
  }

  useEffect(() => {
    refresh();
    return onRulesChange(() => refresh());
  }, []);

  function exportCsv() {
    const header = "At,Action,Actor,Summary,IP,UserAgent";
    const body = rows
      .map((r) =>
        [
          r.at,
          r.action,
          r.actor,
          r.summary,
          r.meta?.ip ?? "",
          r.meta?.userAgent ?? "",
        ]
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
            Auth events from the central audit trail. Full trail also on{" "}
            <Link href="/rules" className="font-semibold text-violet-600">
              Rules hub
            </Link>
            .
          </p>
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
        {rows.length === 0 ? (
          <li className="px-5 py-10 text-center text-[12px] text-slate-400">
            No login events yet. Sign in or out to populate.
          </li>
        ) : (
          rows.slice(0, 80).map((e) => (
            <li key={e.id} className="px-5 py-3 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-800">
                  {e.action} · {e.actor}
                </p>
                <span className="text-[11px] text-slate-400">{e.at}</span>
              </div>
              <p className="text-[11px] text-slate-500">{e.summary}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {e.meta?.ip ?? "—"} · {e.meta?.userAgent ?? "—"}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
