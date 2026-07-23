"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  canRestoreModule,
  getRulesActor,
  listRecycleBin,
  onRulesChange,
  restoreRecord,
  type RecycleBinItem,
} from "@/lib/rules";

/** Settings → Data Management → Recycle Bin (§28.1) */
export function RecycleBinSettingsClient() {
  const [rows, setRows] = useState<RecycleBinItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setRows(listRecycleBin());
  }

  useEffect(() => {
    refresh();
    return onRulesChange((kind) => {
      if (kind === "bin" || kind === "all") refresh();
    });
  }, []);

  function onRestore(id: string) {
    const result = restoreRecord(id);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage(`Restored ${result.item?.recordLabel ?? "record"}`);
    refresh();
    window.setTimeout(() => setMessage(null), 2400);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">Recycle Bin</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Deleted records move here with unlimited retention (§28.1). Restore
          rehydrates the live module store. Acting as{" "}
          <span className="font-semibold text-slate-700">
            {getRulesActor().name}
          </span>
          . Also see the{" "}
          <Link href="/rules" className="font-semibold text-violet-600">
            Cross-Module Rules
          </Link>{" "}
          hub.
        </p>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>
      <ul className="divide-y divide-slate-50">
        {rows.length === 0 && (
          <li className="px-5 py-10 text-center text-[12px] text-slate-400">
            Bin is empty.
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
                {!canRestoreModule(item.module) ? (
                  <span className="text-amber-600"> · restore unsupported</span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              disabled={!canRestoreModule(item.module)}
              onClick={() => onRestore(item.id)}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
