"use client";

import { useMemo, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  downloadCsv,
  parseCsv,
  readFileAsText,
  type CsvRow,
} from "@/lib/import/csv";
import {
  applyLeadImport,
  defaultLeadImportSettings,
  downloadLeadImportErrorReport,
  LEAD_IMPORT_FIELDS,
  previewLeadImport,
  sampleLeadCsvTemplate,
  suggestLeadMapping,
  type LeadImportPreview,
  type LeadImportSettings,
} from "@/lib/leads/import";
import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from "@/lib/leads/types";
import { emitRulesChange } from "@/lib/rules/storage";

type Step = "upload" | "map" | "settings" | "preview" | "done";

export interface ImportLeadsModalProps {
  open: boolean;
  onClose: () => void;
  onImported?: (summary: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  }) => void;
}

export function ImportLeadsModal({
  open,
  onClose,
  onImported,
}: ImportLeadsModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<LeadImportSettings>(
    defaultLeadImportSettings,
  );
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const [summary, setSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const missingRequired = useMemo(() => {
    return LEAD_IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]).map(
      (f) => f.label,
    );
  }, [mapping]);

  if (!open) return null;

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSettings(defaultLeadImportSettings());
    setPreview(null);
    setSummary(null);
    setError(null);
    setBusy(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (!/\.csv$/i.test(file.name)) {
      setError("Please upload a .csv file (Excel: Save As → CSV).");
      return;
    }
    try {
      const text = await readFileAsText(file);
      const parsed = parseCsv(text);
      if (!parsed.headers.length || !parsed.rows.length) {
        setError("CSV is empty or missing a header row.");
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(suggestLeadMapping(parsed.headers));
      setStep("map");
    } catch {
      setError("Could not read that file.");
    }
  }

  function goPreview() {
    if (missingRequired.length) {
      setError(`Map required fields: ${missingRequired.join(", ")}`);
      return;
    }
    setError(null);
    setPreview(previewLeadImport(rows, mapping, settings));
    setStep("preview");
  }

  function confirmImport() {
    setBusy(true);
    setError(null);
    try {
      const result = applyLeadImport(rows, mapping, settings);
      setSummary(result);
      setStep("done");
      emitRulesChange("all");
      onImported?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-leads-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="import-leads-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Import Leads
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === "upload" && "Upload a CSV file"}
              {step === "map" && "Map columns to lead fields"}
              {step === "settings" && "Import settings"}
              {step === "preview" && "Validate and preview"}
              {step === "done" && "Import complete"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/50">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Drop CSV here or click to browse
                </span>
                <span className="text-xs text-muted-foreground">
                  Required columns: First Name, Last Name, Email
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  downloadCsv("leads-import-template.csv", sampleLeadCsvTemplate())
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download sample CSV template
              </button>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                File: <span className="font-medium text-foreground">{fileName}</span>{" "}
                · {rows.length} rows
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Lead field</th>
                      <th className="px-3 py-2 font-medium">CSV column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEAD_IMPORT_FIELDS.map((field) => (
                      <tr key={field.key} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">
                          {field.label}
                          {field.required ? (
                            <span className="text-destructive"> *</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[field.key] ?? ""}
                            onChange={(e) =>
                              setMapping((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                          >
                            <option value="">— Skip —</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "settings" && (
            <div className="space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.skipDuplicates}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      skipDuplicates: e.target.checked,
                      updateExisting: e.target.checked
                        ? false
                        : s.updateExisting,
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Skip duplicates</span>
                  <span className="block text-xs text-muted-foreground">
                    Skip rows whose email already exists on Leads or Contacts
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.updateExisting}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      updateExisting: e.target.checked,
                      skipDuplicates: e.target.checked
                        ? false
                        : s.skipDuplicates,
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Update existing leads</span>
                  <span className="block text-xs text-muted-foreground">
                    Match by email and overwrite phone, company, source, owner
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">
                    Default owner
                  </span>
                  <select
                    value={settings.defaultOwner}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, defaultOwner: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {ACTIVITY_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">
                    Default status
                  </span>
                  <select
                    value={settings.defaultStatus}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        defaultStatus: e.target.value as LeadStatus,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">
                    Default source
                  </span>
                  <select
                    value={settings.defaultSource}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        defaultSource: e.target.value as LeadSource,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-400">
                  {preview.okCount} new
                </span>
                <span className="rounded-md bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-400">
                  {preview.updateCount} update
                </span>
                <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-400">
                  {preview.skipCount} skip
                </span>
                <span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
                  {preview.errorCount} error
                </span>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/80 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.results.slice(0, 50).map((r) => (
                      <tr key={r.rowIndex} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.rowIndex}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.results.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 50 of {preview.results.length} rows
                </p>
              )}
              {(preview.errorCount > 0 || preview.skipCount > 0) && (
                <button
                  type="button"
                  onClick={() => downloadLeadImportErrorReport(preview)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download error report
                </button>
              )}
            </div>
          )}

          {step === "done" && summary && (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Import finished</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                <li>{summary.imported} leads created</li>
                <li>{summary.updated} leads updated</li>
                <li>{summary.skipped} rows skipped</li>
                <li>{summary.errors} rows failed validation</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {step === "done" ? "Close" : "Cancel"}
          </button>
          <div className="flex items-center gap-2">
            {step === "map" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (missingRequired.length) {
                      setError(
                        `Map required fields: ${missingRequired.join(", ")}`,
                      );
                      return;
                    }
                    setStep("settings");
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Next
                </button>
              </>
            )}
            {step === "settings" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goPreview}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Preview
                </button>
              </>
            )}
            {step === "preview" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("settings")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={
                    busy ||
                    !preview ||
                    (preview.okCount === 0 && preview.updateCount === 0)
                  }
                  onClick={confirmImport}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Importing…" : "Confirm import"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
