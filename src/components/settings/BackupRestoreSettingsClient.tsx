"use client";

import { useRef, useState } from "react";
import {
  createBackupPoint,
  deleteBackupPoint,
  downloadBackupPoint,
  importBackupJson,
  listBackupPoints,
  restoreBackupPoint,
  type BackupPoint,
} from "@/lib/backup/store";
import { getRulesActor } from "@/lib/rules";

/** Settings → Data Management → Backup and Restore */
export function BackupRestoreSettingsClient() {
  const [points, setPoints] = useState<BackupPoint[]>(() => listBackupPoints());
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const actor = getRulesActor();

  function refresh() {
    setPoints(listBackupPoints());
  }

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 3200);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Backup & restore
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Snapshot demo session keys (settings, finance, portals, journeys…).
          Acting as{" "}
          <span className="font-semibold text-slate-700">
            {actor.name} ({actor.role})
          </span>
          . Recycle Bin restore is separate.
        </p>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              createBackupPoint();
              refresh();
              flash("Backup created");
            }}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
          >
            Create backup
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const result = importBackupJson(text);
              if (!result.ok) {
                flash(result.message);
                return;
              }
              refresh();
              flash(`Imported ${result.point.label}`);
              e.target.value = "";
            }}
          />
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
                <p className="font-semibold text-slate-800">{p.label}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(p.createdAt).toLocaleString("en-AU")} · {p.keyCount}{" "}
                  keys
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadBackupPoint(p)}
                  className="h-7 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Restore this backup? Current session data for those keys will be overwritten.",
                      )
                    )
                      return;
                    const result = restoreBackupPoint(p);
                    flash(
                      result.ok
                        ? `Restored ${result.restored} keys — reload recommended`
                        : result.message,
                    );
                  }}
                  className="h-7 rounded-lg bg-violet-600 px-2 text-[11px] font-semibold text-white"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteBackupPoint(p.id);
                    refresh();
                  }}
                  className="h-7 rounded-lg border border-rose-200 px-2 text-[11px] font-semibold text-rose-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
