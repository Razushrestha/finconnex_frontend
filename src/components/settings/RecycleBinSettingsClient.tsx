"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  canRestoreModule,
  getRulesActor,
  listRecycleBin,
  onRulesChange,
  restoreRecord,
  purgeRecycleBinItem,
  type RecycleBinItem,
} from "@/lib/rules";
import {
  RECYCLE_ENTITY_TYPES,
  purgeCrmRecycleBinItem,
  recycleEntityTypeOf,
  restoreCrmRecycleBinItem,
} from "@/lib/recycle-bin/api";
import { useCrmRecycleBin } from "@/lib/recycle-bin/use-crm-recycle-bin";
import { cn } from "@/lib/utils";

/** Settings → Data Management → Recycle Bin */
export function RecycleBinSettingsClient() {
  const [entityType, setEntityType] = useState("");
  const crm = useCrmRecycleBin(entityType || undefined);
  const [rows, setRows] = useState<RecycleBinItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refreshLocal() {
    setRows(listRecycleBin());
  }

  useEffect(() => {
    if (crm.loading) return;
    refreshLocal();
  }, [crm.source, crm.loading, crm.refresh]);

  useEffect(() => {
    return onRulesChange((kind) => {
      if (kind === "bin" || kind === "all") refreshLocal();
    });
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  async function onRestore(item: RecycleBinItem) {
    setBusyId(item.id);
    try {
      if (crm.source === "api") {
        await restoreCrmRecycleBinItem(
          recycleEntityTypeOf(item),
          item.recordId,
        );
        flash(`Restored ${item.recordLabel}`);
        crm.refresh();
        return;
      }
      const result = restoreRecord(item.id);
      if (!result.ok) {
        flash(result.message);
        return;
      }
      flash(`Restored ${result.item?.recordLabel ?? "record"}`);
      refreshLocal();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onPurge(item: RecycleBinItem) {
    if (
      !window.confirm(
        `Permanently delete ${item.recordLabel}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      if (crm.source === "api") {
        await purgeCrmRecycleBinItem(recycleEntityTypeOf(item), item.recordId);
      } else {
        purgeRecycleBinItem(item.id, getRulesActor().name);
      }
      flash(`Permanently deleted ${item.recordLabel}`);
      if (crm.source === "api") crm.refresh();
      else refreshLocal();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function canRestore(item: RecycleBinItem) {
    if (crm.source === "api") return true;
    return canRestoreModule(item.module);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold text-slate-900">Recycle Bin</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {crm.source === "api"
              ? "Live CRM"
              : crm.loading
                ? "Connecting…"
                : "Demo"}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Soft-deleted workspace records. Restore puts them back; purge deletes
          them permanently. Also see the{" "}
          <Link href="/rules" className="font-semibold text-violet-600">
            Cross-Module Rules
          </Link>{" "}
          hub.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-500">
            Entity
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-violet-400"
          >
            <option value="">All types</option>
            {RECYCLE_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {crm.error && crm.source === "demo" ? (
          <p className="mt-2 text-[12px] text-slate-500">{crm.error}</p>
        ) : null}
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>
      <ul className="divide-y divide-slate-50">
        {rows.length === 0 && (
          <li className="px-5 py-10 text-center text-[12px] text-slate-400">
            {crm.loading ? "Loading…" : "Bin is empty."}
          </li>
        )}
        {rows.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[12px]"
          >
            <div>
              <p className="font-semibold text-slate-800">{item.recordLabel}</p>
              <p className="text-[11px] text-slate-400">
                {item.recordType} · {item.deletedAt} · {item.deletedBy}
                {!canRestore(item) ? (
                  <span className="text-amber-600"> · restore unsupported</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canRestore(item) || busyId === item.id}
                onClick={() => void onRestore(item)}
                className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Restore
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void onPurge(item)}
                className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 disabled:opacity-40"
              >
                Delete forever
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
