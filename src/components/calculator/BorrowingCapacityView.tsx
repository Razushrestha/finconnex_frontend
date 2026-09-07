"use client";

import React, { useState } from "react";
import {
  Calculator,
  DollarSign,
  Users,
  CreditCard,
  Baby,
  Calendar,
  ShieldAlert,
  TrendingUp,
  Receipt,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";

export default function BorrowingCapacityView() {
  // Form input states
  const [grossIncome, setGrossIncome] = useState("");
  const [coIncome, setCoIncome] = useState("");
  const [livingExpenses, setLivingExpenses] = useState("");
  const [existingCommitments, setExistingCommitments] = useState("");
  const [dependents, setDependents] = useState("");
  const [assessmentTerm, setAssessmentTerm] = useState("30");

  // Calculated results state (null until calculated)
  const [results, setResults] = useState<{
    maxCapacity: number;
    maxMonthlyServicing: number;
    uncommittedBuffer: number;
  } | null>(null);

  // Calculation Logic for Borrowing Capacity
  const performCalculation = () => {
    const annualIncome = parseFloat(grossIncome) || 0;
    const coAnnualIncome = parseFloat(coIncome) || 0;
    const monthlyExpenses = parseFloat(livingExpenses) || 0;
    const commitments = parseFloat(existingCommitments) || 0;
    const termYears = parseFloat(assessmentTerm) || 30;

    const totalGrossAnnual = annualIncome + coAnnualIncome;
    if (totalGrossAnnual <= 0) {
      alert("Please enter a valid gross annual income.");
      return null;
    }

    // Approximate monthly net income (tax approximation ~25%)
    const monthlyGross = totalGrossAnnual / 12;
    const estimatedMonthlyTax = monthlyGross * 0.25;
    const netMonthlyIncome = monthlyGross - estimatedMonthlyTax;

    // Net surplus available for mortgage repayment
    const netSurplus = netMonthlyIncome - monthlyExpenses - commitments;

    if (netSurplus <= 0) {
      alert(
        "Expenses and commitments exceed net income. Borrowing capacity is $0.",
      );
      const zeroResults = {
        maxCapacity: 0,
        maxMonthlyServicing: 0,
        uncommittedBuffer: 0,
      };
      setResults(zeroResults);
      return zeroResults;
    }

    // APRA Buffer assessment rate: 6.20% benchmark + 3.00% buffer = 9.20% p.a. (0.007667 monthly)
    const monthlyRate = 0.092 / 12;
    const totalPeriods = termYears * 12;

    // Max loan capacity calculated backwards from net monthly surplus serviceability
    const maxCapacity =
      (netSurplus * (Math.pow(1 + monthlyRate, totalPeriods) - 1)) /
      (monthlyRate * Math.pow(1 + monthlyRate, totalPeriods));

    const safeCapacity = Math.max(0, maxCapacity);
    const bufferMargin = netSurplus * 0.35; // Estimated safe margin buffer

    const computedResults = {
      maxCapacity: safeCapacity,
      maxMonthlyServicing: netSurplus,
      uncommittedBuffer: bufferMargin,
    };

    setResults(computedResults);
    return computedResults;
  };

  const handleCalculate = () => {
    const currentResults = performCalculation();
    if (!currentResults) return;

    // Save calculation directly to localStorage audit trail
    const newRecord = {
      id: Date.now(),
      type: "Borrowing Capacity",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      inputs: {
        "Gross Income": `$${Number(grossIncome).toLocaleString()}`,
        ...(Number(coIncome) > 0
          ? { "Co-Borrower Income": `$${Number(coIncome).toLocaleString()}` }
          : {}),
        "Monthly Expenses": `$${Number(livingExpenses).toLocaleString()}`,
        ...(Number(existingCommitments) > 0
          ? { Commitments: `$${Number(existingCommitments).toLocaleString()}` }
          : {}),
        "Assessment Term": `${assessmentTerm} years`,
      },
      summary: `Max Capacity: $${Math.round(currentResults.maxCapacity).toLocaleString()} AUD`,
      badge: "Capacity Profile",
    };

    try {
      const existing = localStorage.getItem("calc_history");
      const historyArray = existing ? JSON.parse(existing) : [];
      const updatedHistory = [newRecord, ...historyArray];
      localStorage.setItem("calc_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Failed to save borrowing capacity history:", err);
    }
  };

  // Reset Form & Results
  const handleReset = () => {
    setGrossIncome("");
    setCoIncome("");
    setLivingExpenses("");
    setExistingCommitments("");
    setDependents("");
    setAssessmentTerm("30");
    setResults(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Form */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-500"></span>{" "}
              Applicant Financial Profile
            </span>
            <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full font-medium">
              APRA Buffer: +3.00%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Gross Annual Income *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 135000"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Co-borrower Annual Income
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 85000"
                  value={coIncome}
                  onChange={(e) => setCoIncome(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Monthly Living Expenses (HEM Base) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 3850"
                  value={livingExpenses}
                  onChange={(e) => setLivingExpenses(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Existing Monthly Commitments
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 1200"
                  value={existingCommitments}
                  onChange={(e) => setExistingCommitments(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Baby className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Number of Dependents
              </label>
              <input
                type="number"
                placeholder="e.g. 2"
                value={dependents}
                onChange={(e) => setDependents(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Assessment Loan Term (Years)
              </label>
              <input
                type="number"
                placeholder="30"
                value={assessmentTerm}
                onChange={(e) => setAssessmentTerm(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl text-xs transition shadow-md shadow-purple-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Recalculate Capacity
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* APRA Criteria notice */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            APRA Buffer Criteria
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Lenders evaluate serviceability using a statutory stress-test floor.
            Currently 6.20% benchmark + 3.00% buffer ={" "}
            <span className="text-purple-700 dark:text-purple-300 font-semibold">
              9.20% Serviceability Assessment Rate
            </span>
            . Net monthly surplus is determined after shading non-guaranteed
            bonuses and applying statutory HEM expenditure thresholds.
          </p>
        </div>
      </div>

      {/* Right Results */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full transition-colors">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Estimated Capacity
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full font-medium">
                {results ? "High Confidence" : "Awaiting Input"}
              </span>
            </div>

            <div className="bg-gradient-to-br from-purple-50/70 to-white dark:from-purple-950/40 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-5 mb-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Maximum Borrowing Capacity
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-baseline gap-2">
                {results
                  ? `$${Math.round(results.maxCapacity).toLocaleString()}`
                  : "$0"}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  AUD
                </span>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-2 font-medium flex items-center gap-1">
                <Info className="w-3 h-3 text-purple-500 shrink-0" />
                {results
                  ? "Surplus capacity allows approval buffer with Tier 1 and 2 lenders."
                  : "Fill out the financial profile and click calculate."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50/60 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Max Monthly Servicing
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {results
                    ? `$${Math.round(results.maxMonthlyServicing).toLocaleString()}/mo`
                    : "$0/mo"}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Net surplus after commitments
                </span>
              </div>
              <div className="bg-slate-50/60 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Stress-Test Rate
                </span>
                <span className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
                  9.20% p.a.
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  APRA buffer enforced
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                Uncommitted Net Income
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {results
                  ? `$${Math.round(results.uncommittedBuffer).toLocaleString()} buffer margin`
                  : "$0 buffer margin"}
              </span>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
            >
              Apply to File
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
