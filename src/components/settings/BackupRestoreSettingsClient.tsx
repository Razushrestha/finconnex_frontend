"use client";

import { useEffect, useState } from "react";
import {
  getCrmWorkspaceBackup,
  listCrmWorkspaceBackups,
  requestCrmWorkspaceBackup,
  restoreCrmWorkspaceBackup,
  tryCrmWorkspaceBackups,
  type CrmWorkspaceBackup,
} from "@/lib/backup/api";

/** Settings → Data Management → Backup and Restore */
export function BackupRestoreSettingsClient() {
  const [points, setPoints] = useState<CrmWorkspaceBackup[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "offline">("offline");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const remote = await tryCrmWorkspaceBackups(() => listCrmWorkspaceBackups());
    if (!remote) {
      setSource("offline");
      return;
    }
    setPoints(remote);
    setSource("api");
  }

  useEffect(() => {
    void refresh();
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 3200);
  }

  async function onCreate() {
    setBusy(true);
    try {
      await requestCrmWorkspaceBackup();
      await refresh();
      flash("Backup queued");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not request backup");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(id: string) {
    setBusy(true);
    try {
      const row = await getCrmWorkspaceBackup(id);
      const blob = new Blob([JSON.stringify(row.payload ?? row, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workspace-backup-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not download backup");
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(id: string) {
    if (
      !window.confirm(
        "Restore missing companies, contacts, deals, and leads from this backup? Existing rows are not overwritten.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await restoreCrmWorkspaceBackup(id);
      flash("Restore finished");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not restore backup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Backup & restore
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          POST /v1/workspace-backups. Restore inserts missing CRM records only.
          Recycle Bin restore is separate.
        </p>
        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          {source === "api" ? "Live CRM" : "CRM unavailable"}
        </span>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCreate()}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            Create backup
          </button>
        </div>
      </div>
      <ul className="divide-y divide-slate-50">
        {points.length === 0 ? (
          <li className="px-5 py-10 text-center text-[12px] text-slate-400">
            No restore points yet.
          </li>
        ) : (
          points.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[12px]"
            >
              <div>
                <p className="font-semibold text-slate-800">{p.status}</p>
                <p className="text-[11px] text-slate-400">
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleString("en-AU")
                    : "—"}
                  {p.sizeBytes != null ? ` · ${p.sizeBytes} bytes` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDownload(p.id)}
                  className="h-7 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={busy || p.status !== "COMPLETED"}
                  onClick={() => void onRestore(p.id)}
                  className="h-7 rounded-lg bg-violet-600 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
