"use client";

import { useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  ADS_PLATFORM_LABEL,
  previewAdsSync,
  syncAdsLeads,
  type AdsPlatform,
} from "@/lib/leads/ads-sync";
import { emitRulesChange } from "@/lib/rules/storage";

const PLATFORMS: AdsPlatform[] = ["facebook", "linkedin", "tiktok", "google"];

export function AdsSyncModal({
  open,
  platform,
  onClose,
  onSynced,
}: {
  open: boolean;
  platform: AdsPlatform;
  onClose: () => void;
  onSynced?: (summary: { imported: number; skipped: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(
    null,
  );

  const preview = useMemo(
    () => (open ? previewAdsSync(platform) : null),
    [open, platform],
  );

  if (!open) return null;

  async function run() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 420));
    const result = syncAdsLeads(platform, { skipDuplicates });
    emitRulesChange("all");
    const summary = {
      imported: result.imported.length,
      skipped: result.skipped,
    };
    setDone(summary);
    setBusy(false);
    onSynced?.(summary);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              {ADS_PLATFORM_LABEL[platform]}
            </h2>
            <p className="text-[11px] text-slate-500">
              Demo sync — fixture leads tagged Social Media
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {done ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">
              Imported {done.imported}
              {done.skipped ? ` · skipped ${done.skipped} duplicate(s)` : ""}
            </p>
          ) : (
            <>
              <p className="text-[12px] text-slate-600">
                {preview?.fixtures.length ?? 0} lead(s) in mock feed ·{" "}
                {preview?.newCount ?? 0} new
                {(preview?.duplicateEmails.length ?? 0) > 0
                  ? ` · ${preview!.duplicateEmails.length} already in CRM`
                  : ""}
              </p>
              <ul className="max-h-48 divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-100">
                {preview?.fixtures.map((f) => (
                  <li key={f.id} className="px-3 py-2 text-[12px]">
                    <p className="font-semibold text-slate-800">
                      {f.firstName} {f.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {f.email} · {f.campaign}
                    </p>
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600"
                />
                Skip duplicates by email
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700"
          >
            {done ? "Close" : "Cancel"}
          </button>
          {!done ? (
            <button
              type="button"
              disabled={busy || (preview?.fixtures.length ?? 0) === 0}
              onClick={() => void run()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`}
              />
              {busy ? "Syncing…" : "Sync leads"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { PLATFORMS };
