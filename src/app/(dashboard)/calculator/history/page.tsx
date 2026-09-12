"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearCalculatorHistory,
  loadCalculatorHistory,
  removeCalculatorRecord,
  type CalculationRecord,
} from "@/lib/utils/calculatorHistory";
import {
  getCrmCalculation,
  isCrmCalculationId,
  tryCrmCalculation,
} from "@/lib/calculator/api";

export default function CalculatorHistoryPage() {
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [source, setSource] = useState<"api" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CalculationRecord | null>(null);

  async function refresh() {
    setLoading(true);
    const next = await loadCalculatorHistory();
    setHistory(next.records);
    setSource(next.source);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all calculation history?")) {
      return;
    }
    await clearCalculatorHistory(history.map((row) => row.id));
    setHistory([]);
    setDetail(null);
  };

  async function handleDelete(id: string) {
    await removeCalculatorRecord(id);
    setHistory((rows) => rows.filter((row) => row.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  async function handleOpen(record: CalculationRecord) {
    setDetail(record);
    if (!isCrmCalculationId(record.id)) return;
    const fresh = await tryCrmCalculation(() => getCrmCalculation(record.id));
    if (!fresh) return;
    setDetail({
      ...record,
      type: fresh.inputs._tool || fresh.type,
      date: fresh.savedAt || record.date,
      summary: `${fresh.result.primaryLabel}: ${fresh.result.primaryValue.toLocaleString("en-AU")}`,
      badge: fresh.title,
      inputs: Object.fromEntries(
        Object.entries(fresh.inputs).filter(([key]) => !key.startsWith("_")),
      ),
    });
  }

  const filteredHistory = history.filter((record) => {
    if (activeFilter === "All") return true;
    const type = record.type.toLowerCase();
    if (activeFilter === "Loan Repayments") {
      return (
        type.includes("loan") ||
        type.includes("repayment") ||
        type.includes("interest")
      );
    }
    if (activeFilter === "Borrowing Capacity") {
      return type.includes("borrowing") || type.includes("capacity");
    }
    if (activeFilter === "Stamp Duty & Fees") {
      return (
        type.includes("stamp") ||
        type.includes("duty") ||
        type.includes("fee") ||
        type.includes("tax")
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-full px-6 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between w-full gap-3">
        <Link
          href="/calculator"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
        >
          <span>←</span> Back to Calculator
        </Link>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {loading ? "Connecting…" : source === "api" ? "Live CRM" : "Demo"}
          </span>
          <button
            onClick={() => void handleClearHistory()}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-xs cursor-pointer"
          >
            Clear History
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          "All",
          "Loan Repayments",
          "Borrowing Capacity",
          "Stamp Duty & Fees",
        ].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeFilter === filter
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {loading
              ? "Loading saved calculations…"
              : "No matching calculation history found."}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Save from Loan Repayments, or calculate Borrowing / Stamp Duty to
            POST /v1/calculations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {filteredHistory.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => void handleOpen(record)}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                    {record.type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {record.date}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80 mb-3 space-y-1.5">
                  {Object.entries(record.inputs).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between text-xs text-slate-600 dark:text-slate-400"
                    >
                      <span>{key}:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {record.summary}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(record.id)}
                  className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 text-xs text-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-slate-900">
              {detail.badge} · GET /v1/calculations/{detail.id}
            </p>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="text-slate-500"
            >
              Close
            </button>
          </div>
          <p>{detail.summary}</p>
        </div>
      ) : null}
    </div>
  );
}
