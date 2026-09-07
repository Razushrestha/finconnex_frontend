"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface HistoryRecord {
  id: number;
  type: string;
  date: string;
  inputs: Record<string, string>;
  summary: string;
  badge: string;
}

export default function CalculatorHistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("calc_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load calculation history:", err);
    }
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all calculation history?")) {
      localStorage.removeItem("calc_history");
      setHistory([]);
    }
  };

  // Filter calculation records based on selected type
  const filteredHistory = history.filter((record) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Loan Repayments") {
      return (
        record.type.toLowerCase().includes("loan") ||
        record.type.toLowerCase().includes("repayment") ||
        record.type.toLowerCase().includes("interest")
      );
    }
    if (activeFilter === "Borrowing Capacity") {
      return record.type.toLowerCase().includes("borrowing");
    }
    if (activeFilter === "Stamp Duty & Fees") {
      return (
        record.type.toLowerCase().includes("stamp") ||
        record.type.toLowerCase().includes("duty") ||
        record.type.toLowerCase().includes("fee")
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-full px-6 py-6 flex flex-col gap-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between w-full">
        <Link
          href="/calculator"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
        >
          <span>←</span> Back to Calculator
        </Link>

        <button
          onClick={handleClearHistory}
          className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-xs cursor-pointer"
        >
          Clear History
        </button>
      </div>

      {/* Filter Tabs */}
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

      {/* History Records List */}
      {filteredHistory.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            No matching calculation history found.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Try switching filters or run new calculations from your tool views.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {filteredHistory.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors"
            >
              <div>
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
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {record.summary}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  {record.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
