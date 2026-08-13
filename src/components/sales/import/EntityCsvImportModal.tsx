"use client";

import { useMemo, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import {
  downloadCsv,
  parseCsv,
  readFileAsText,
  type CsvRow,
} from "@/lib/import/csv";

export interface CsvImportFieldDef {
  key: string;
  label: string;
  required?: boolean;
}

export interface CsvImportPreviewRow {
  rowIndex: number;
  status: "ok" | "skip" | "error" | "update";
  message: string;
  email?: string;
  name: string;
}

export interface CsvImportPreview {
  results: CsvImportPreviewRow[];
  okCount: number;
  skipCount: number;
  errorCount: number;
  updateCount: number;
}

export interface EntityCsvImportModalProps {
  open: boolean;
  title: string;
  entityLabel: string;
  fields: CsvImportFieldDef[];
  owners: readonly string[];
  statuses: readonly string[];
  sources: readonly string[];
  defaultOwner: string;
  defaultStatus: string;
  defaultSource: string;
  /** Shown under the upload dropzone. */
  requiredHint?: string;
  /** Preview table third column header (default Email). */
  identityColumnLabel?: string;
  /** Settings: label for the "source" dropdown (default Default source). */
  sourceFieldLabel?: string;
  skipDuplicatesLabel?: string;
  updateExistingLabel?: string;
  suggestMapping: (headers: string[]) => Record<string, string>;
  preview: (
    rows: CsvRow[],
    mapping: Record<string, string>,
    settings: {
      skipDuplicates: boolean;
      updateExisting: boolean;
      defaultOwner: string;
      defaultStatus: string;
      defaultSource: string;
    },
  ) => CsvImportPreview;
  apply: (
    rows: CsvRow[],
    mapping: Record<string, string>,
    settings: {
      skipDuplicates: boolean;
      updateExisting: boolean;
      defaultOwner: string;
      defaultStatus: string;
      defaultSource: string;
    },
  ) => { imported: number; updated: number; skipped: number; errors: number };
  downloadErrorReport: (preview: CsvImportPreview) => void;
  sampleTemplate: string;
  sampleFilename: string;
  onClose: () => void;
  onImported?: (summary: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  }) => void;
}

type Step = "upload" | "map" | "settings" | "preview" | "done";

export function EntityCsvImportModal(props: EntityCsvImportModalProps) {
  const {
    open,
    title,
    entityLabel,
    fields,
    owners,
    statuses,
    sources,
    defaultOwner,
    defaultStatus,
    defaultSource,
    requiredHint = "Required: First Name, Last Name, Email",
    identityColumnLabel = "Email",
    sourceFieldLabel = "Default source",
    skipDuplicatesLabel = "Skip rows whose email already exists",
    updateExistingLabel = "Match by email and overwrite mapped fields",
    suggestMapping,
    preview,
    apply,
    downloadErrorReport,
    sampleTemplate,
    sampleFilename,
    onClose,
    onImported,
  } = props;

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [owner, setOwner] = useState(defaultOwner);
  const [status, setStatus] = useState(defaultStatus);
  const [source, setSource] = useState(defaultSource);
  const [previewData, setPreviewData] = useState<CsvImportPreview | null>(null);
  const [summary, setSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settings = {
    skipDuplicates,
    updateExisting,
    defaultOwner: owner,
    defaultStatus: status,
    defaultSource: source,
  };

  const missingRequired = useMemo(
    () => fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label),
    [fields, mapping],
  );

  if (!open) return null;

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSkipDuplicates(true);
    setUpdateExisting(false);
    setOwner(defaultOwner);
    setStatus(defaultStatus);
    setSource(defaultSource);
    setPreviewData(null);
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
      setMapping(suggestMapping(parsed.headers));
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
    setPreviewData(preview(rows, mapping, settings));
    setStep("preview");
  }

  function confirmImport() {
    setBusy(true);
    setError(null);
    try {
      const result = apply(rows, mapping, settings);
      setSummary(result);
      setStep("done");
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
        aria-labelledby="entity-csv-import-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="entity-csv-import-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === "upload" && "Upload a CSV file"}
              {step === "map" && `Map columns to ${entityLabel.toLowerCase()} fields`}
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
                  {requiredHint}
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
                onClick={() => downloadCsv(sampleFilename, sampleTemplate)}
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
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">CSV column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
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
                  checked={skipDuplicates}
                  onChange={(e) => {
                    setSkipDuplicates(e.target.checked);
                    if (e.target.checked) setUpdateExisting(false);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Skip duplicates</span>
                  <span className="block text-xs text-muted-foreground">
                    {skipDuplicatesLabel}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => {
                    setUpdateExisting(e.target.checked);
                    if (e.target.checked) setSkipDuplicates(false);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Update existing</span>
                  <span className="block text-xs text-muted-foreground">
                    {updateExistingLabel}
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">
                    Default owner
                  </span>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {owners.map((o) => (
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
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">
                    {sourceFieldLabel}
                  </span>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === "preview" && previewData && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-400">
                  {previewData.okCount} new
                </span>
                <span className="rounded-md bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-400">
                  {previewData.updateCount} update
                </span>
                <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-400">
                  {previewData.skipCount} skip
                </span>
                <span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
                  {previewData.errorCount} error
                </span>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/80 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">{identityColumnLabel}</th>
                      <th className="px-3 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.results.slice(0, 50).map((r) => (
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
              {(previewData.errorCount > 0 || previewData.skipCount > 0) && (
                <button
                  type="button"
                  onClick={() => downloadErrorReport(previewData)}
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
                <li>{summary.imported} created</li>
                <li>{summary.updated} updated</li>
                <li>{summary.skipped} skipped</li>
                <li>{summary.errors} failed validation</li>
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
                    !previewData ||
                    (previewData.okCount === 0 && previewData.updateCount === 0)
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
