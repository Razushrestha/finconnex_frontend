"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  Calculator,
  Equal,
  RotateCcw,
  Save,
  Download,
  Share2,
  History,
  Trash2,
  Play,
} from "lucide-react";
import {
  CALCULATOR_FIELDS,
  CALCULATOR_FORMULAS,
  CALCULATOR_TYPE_STYLE,
  CALCULATOR_TYPES,
  CALC_CURRENCIES,
  CALC_OWNERS,
  CALC_SHARE_TARGETS,
  deleteCalculation,
  emptyInputs,
  exportCalculationText,
  formatCalcAt,
  formatCalcValue,
  listCalculations,
  nextCalcIds,
  runCalculator,
  seedCalculations,
  upsertCalculation,
  type CalcCurrency,
  type CalcRunResult,
  type CalculatorType,
  type SavedCalculation,
} from "@/lib/calculator/types";
import { softDeleteRecord } from "@/lib/rules";
import { cn } from "@/lib/utils";

export function CalculatorWorkspaceClient() {
  const [type, setType] = useState<CalculatorType>("Loan");
  const [currency, setCurrency] = useState<CalcCurrency>("AUD");
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    emptyInputs("Loan"),
  );
  const [result, setResult] = useState<CalcRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [savedBy, setSavedBy] = useState<string>(CALC_OWNERS[0]);
  const [shareTarget, setShareTarget] = useState<string>(CALC_SHARE_TARGETS[1]);
  const [history, setHistory] = useState<SavedCalculation[]>(seedCalculations);
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<"workspace" | "history">("workspace");

  useEffect(() => {
    setHistory(listCalculations());
  }, []);

  const fields = CALCULATOR_FIELDS[type];
  const formula = CALCULATOR_FORMULAS[type];

  const primaryDisplay = useMemo(() => {
    if (!result) return null;
    return formatCalcValue(
      result.primaryValue,
      result.primaryFormat,
      currency,
    );
  }, [result, currency]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function selectType(next: CalculatorType) {
    setType(next);
    setInputs(emptyInputs(next));
    setResult(null);
    setError(null);
  }

  function setField(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function onCalculate() {
    const out = runCalculator(type, inputs);
    if (!out.ok) {
      setResult(null);
      setError(out.error);
      return;
    }
    setError(null);
    setResult(out.result);
  }

  function onReset() {
    setInputs(emptyInputs(type));
    setResult(null);
    setError(null);
    setTitle("");
  }

  function onSave() {
    if (!result) {
      flash("Calculate first");
      return;
    }
    const ids = nextCalcIds();
    const saved = upsertCalculation({
      id: ids.id,
      calcId: ids.calcId,
      title: title.trim() || `${type} calculation`,
      type,
      currency,
      inputs: { ...inputs },
      result,
      formula: result.formula,
      savedBy,
      savedAt: formatCalcAt(),
    });
    setHistory(listCalculations());
    flash(`Saved ${saved.calcId}`);
  }

  function onExport() {
    if (!result) {
      flash("Calculate first");
      return;
    }
    exportCalculationText({
      calcId: "DRAFT",
      title: title.trim() || `${type} calculation`,
      type,
      currency,
      inputs,
      result,
      formula: result.formula,
    });
    flash("Result exported");
  }

  function onShare() {
    if (!result) {
      flash("Calculate first");
      return;
    }
    const ids = nextCalcIds();
    upsertCalculation({
      id: ids.id,
      calcId: ids.calcId,
      title: title.trim() || `${type} calculation`,
      type,
      currency,
      inputs: { ...inputs },
      result,
      formula: result.formula,
      savedBy,
      savedAt: formatCalcAt(),
      sharedWith: shareTarget,
    });
    setHistory(listCalculations());
    flash(`Shared with ${shareTarget}`);
  }

  function loadFromHistory(c: SavedCalculation) {
    setType(c.type);
    setCurrency(c.currency);
    setInputs({ ...emptyInputs(c.type), ...c.inputs });
    setResult(c.result);
    setTitle(c.title);
    setError(null);
    setPanel("workspace");
    flash(`Loaded ${c.calcId}`);
  }

  function removeHistory(id: string) {
    const row = listCalculations().find((c) => c.id === id);
    if (!row) return;
    const gate = softDeleteRecord({
      action: "calculator.history.delete",
      module: "calculator.history",
      recordId: row.id,
      recordLabel: row.calcId,
      recordType: "Calculation",
      snapshot: row,
    });
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    deleteCalculation(id);
    setHistory(listCalculations());
    flash("Moved to Recycle Bin");
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1200px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Calculator
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Calculator className="h-2.5 w-2.5" />
              §17
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPanel("workspace")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
                panel === "workspace"
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Equal className="h-3.5 w-3.5" />
              Workspace
            </button>
            <button
              type="button"
              onClick={() => setPanel("history")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
                panel === "history"
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <History className="h-3.5 w-3.5" />
              History ({history.length})
            </button>
          </div>
        </div>

        {panel === "history" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Calculation</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Result</th>
                  <th className="px-3 py-2.5">Saved by</th>
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-50 hover:bg-violet-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {c.calcId}
                      </div>
                      <div className="text-[11px] text-slate-600">{c.title}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                          CALCULATOR_TYPE_STYLE[c.type],
                        )}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {formatCalcValue(
                        c.result.primaryValue,
                        c.result.primaryFormat,
                        c.currency,
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{c.savedBy}</td>
                    <td className="px-3 py-3 text-slate-500">{c.savedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => loadFromHistory(c)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            exportCalculationText(c);
                            flash("Exported");
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistory(c.id)}
                          className="rounded-md border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No saved calculations yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Select calculator
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CALCULATOR_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectType(t)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                        type === t
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Enter values
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    Currency
                    <select
                      value={currency}
                      onChange={(e) =>
                        setCurrency(e.target.value as CalcCurrency)
                      }
                      className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none"
                    >
                      {CALC_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {f.label}
                        {f.suffix ? (
                          <span className="ml-1 font-normal text-slate-400">
                            ({f.suffix})
                          </span>
                        ) : null}
                      </span>
                      <input
                        value={inputs[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        inputMode="decimal"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500"
                      />
                      {f.hint ? (
                        <span className="text-[10px] text-slate-400">
                          {f.hint}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>

                {error ? (
                  <p className="mt-3 text-[11px] font-medium text-rose-600">
                    {error}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={onCalculate}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Calculate
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Formula
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700">
                  {result?.formula ?? formula}
                </p>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/80 to-white p-4 shadow-sm">
                <div className="mb-1 text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
                  Output result
                </div>
                {result && primaryDisplay ? (
                  <>
                    <div className="text-[11px] font-medium text-slate-500">
                      {result.primaryLabel}
                    </div>
                    <div className="mt-0.5 text-[28px] font-bold tracking-tight text-slate-900">
                      {primaryDisplay}
                    </div>
                    <ul className="mt-3 space-y-1.5 border-t border-violet-100 pt-3">
                      {result.lines.map((l) => (
                        <li
                          key={l.label}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-slate-500">{l.label}</span>
                          <span className="font-semibold text-slate-800">
                            {formatCalcValue(l.value, l.format, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="py-6 text-center text-[12px] text-slate-400">
                    Enter values and hit Calculate
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
                <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Save &amp; share
                </div>
                <label className="mb-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Title
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${type} calculation`}
                    className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
                  />
                </label>
                <label className="mb-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Saved by
                  </span>
                  <select
                    value={savedBy}
                    onChange={(e) => setSavedBy(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  >
                    {CALC_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mb-3 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Share with
                  </span>
                  <select
                    value={shareTarget}
                    onChange={(e) => setShareTarget(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  >
                    {CALC_SHARE_TARGETS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={onSave}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-[11px] font-semibold text-white hover:bg-violet-700"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save calculation
                  </button>
                  <button
                    type="button"
                    onClick={onExport}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export result
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share calculation
                  </button>
                </div>
              </div>

              {history.length > 0 ? (
                <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      Recent
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanel("history")}
                      className="text-[10px] font-semibold text-violet-600 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {history.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => loadFromHistory(c)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-violet-50"
                        >
                          <span className="truncate text-[11px] font-medium text-slate-700">
                            {c.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                            {formatCalcValue(
                              c.result.primaryValue,
                              c.result.primaryFormat,
                              c.currency,
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
