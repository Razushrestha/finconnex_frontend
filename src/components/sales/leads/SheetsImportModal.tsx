"use client";

import { useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import {
  applyLeadImport,
  defaultLeadImportSettings,
  previewLeadImport,
  suggestLeadMapping,
} from "@/lib/leads/import";
import { parseCsv } from "@/lib/import/csv";
import { emitRulesChange } from "@/lib/rules/storage";

const SAMPLE_SHEET = `First Name,Last Name,Email,Phone,Company,Source
Ava,Chen,ava.chen.sheets@example.com,+61 400 555 101,Chen Homes,Referral
Noah,Singh,noah.singh.sheets@example.com,+61 400 555 102,Singh Capital,Website
Isla,Nguyen,isla.nguyen.sheets@example.com,,Nguyen Living,Partner`;

const DEMO_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/demo-finconnex-leads/edit#gid=0";

export function SheetsImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: (summary: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  }) => void;
}) {
  const [paste, setPaste] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  if (!open) return null;

  function reset() {
    setPaste("");
    setSheetUrl("");
    setBusy(false);
    setError(null);
    setDone(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function runImport(text: string) {
    setError(null);
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      setError("Paste needs a header row and at least one data row.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 360));
    const mapping = suggestLeadMapping(parsed.headers);
    const settings = defaultLeadImportSettings();
    previewLeadImport(parsed.rows, mapping, settings);
    const summary = applyLeadImport(parsed.rows, mapping, settings);
    emitRulesChange("all");
    setDone(summary);
    setBusy(false);
    onImported?.(summary);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Google Sheets Import
            </h2>
            <p className="text-[11px] text-slate-500">
              Demo — paste sheet CSV/TSV or load the sample range
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {done ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">
              Imported {done.imported}
              {done.updated ? ` · updated ${done.updated}` : ""}
              {done.skipped ? ` · skipped ${done.skipped}` : ""}
              {done.errors ? ` · errors ${done.errors}` : ""}
            </p>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Sheet URL (demo)
                </span>
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder={DEMO_SHEET_URL}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[12px] text-slate-800 outline-none focus:border-violet-400"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSheetUrl(DEMO_SHEET_URL);
                  void runImport(SAMPLE_SHEET);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Load demo sheet range
              </button>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Or paste CSV / TSV
                </span>
                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={7}
                  placeholder={SAMPLE_SHEET}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-800 outline-none focus:border-violet-400"
                />
              </label>
              {error ? (
                <p className="text-[12px] font-medium text-red-600">{error}</p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
          >
            {done ? "Close" : "Cancel"}
          </button>
          {!done ? (
            <button
              type="button"
              disabled={busy || !paste.trim()}
              onClick={() => void runImport(paste)}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import rows"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
