"use client";

import React, { useEffect, useState } from "react";
import { persistCalculatorResult } from "@/lib/utils/calculatorHistory";
import {
  calculateLoanRepayment,
  parseLoanCalcType,
  type LoanFrequency,
} from "@/lib/calculator/loan-repayments";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { getRulesActor } from "@/lib/rules/actor";

export default function LoanRepaymentsView() {
  const [currency, setCurrency] = useState("AUD ($)");
  const [calcType, setCalcType] = useState("Loan (Principal & Interest)");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termYears, setTermYears] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [extraPayment, setExtraPayment] = useState("");
  const [title, setTitle] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [savers, setSavers] = useState<AssignableOwner[]>([]);
  const [saversReady, setSaversReady] = useState(false);
  const [shareWith, setShareWith] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    void loadAssignableOwners()
      .then((rows) => {
        const actor = getRulesActor();
        const next = [...rows];
        if (
          actor.name.trim() &&
          !next.some(
            (row) =>
              row.name.trim().toLowerCase() === actor.name.trim().toLowerCase(),
          )
        ) {
          next.unshift({
            id: actor.id || "current-user",
            name: actor.name.trim(),
            email: actor.email || "",
          });
        }
        setSavers(next);
        setSavedBy((current) => {
          if (
            current &&
            next.some(
              (row) =>
                row.name === current ||
                row.id === current ||
                assignableOwnerLabel(row) === current,
            )
          ) {
            return current;
          }
          const match =
            next.find((row) => row.name === actor.name.trim()) ||
            next.find((row) => row.id === defaultAssignableOwnerId(next));
          return match?.name || actor.name.trim() || current;
        });
      })
      .finally(() => setSaversReady(true));
  }, []);

  const PRESETS = [
    "Home Mortgage",
    "Commercial Facility",
    "Refinance Plus",
    "Asset & Equipment",
  ] as const;

  // Calculated results state (null until calculated)
  const [results, setResults] = useState<{
    periodicPayment: number;
    totalRepayments: number;
    totalInterest: number;
    principalPercentage: number;
    interestPercentage: number;
    yearsSavedStr: string;
    interestSaved: number;
    periodicRate: number;
    totalPeriods: number;
    formula: string;
  } | null>(null);

  // Preset handler to quickly fill fields
  const applyPreset = (type: string) => {
    setActivePreset(type);
    setResults(null);
    if (type === "Home Mortgage") {
      setLoanAmount("500000");
      setInterestRate("6.20");
      setTermYears("30");
      setExtraPayment("250");
      setCalcType("Loan (Principal & Interest)");
    } else if (type === "Commercial Facility") {
      setLoanAmount("1200000");
      setInterestRate("6.85");
      setTermYears("20");
      setExtraPayment("500");
      setCalcType("Loan (Principal & Interest)");
    } else if (type === "Refinance Plus") {
      setLoanAmount("750000");
      setInterestRate("5.99");
      setTermYears("30");
      setExtraPayment("300");
      setCalcType("Loan (Principal & Interest)");
    } else if (type === "Asset & Equipment") {
      setLoanAmount("145000");
      setInterestRate("7.10");
      setTermYears("5");
      setExtraPayment("0");
      setCalcType("Loan (Principal & Interest)");
    }
  };

  // Calculation Logic (returns results directly for immediate saving if needed)
  const performCalculation = () => {
    const P = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const years = parseFloat(termYears);
    const extra = parseFloat(extraPayment) || 0;

    if (isNaN(P) || isNaN(annualRate) || isNaN(years) || P <= 0 || years <= 0) {
      alert(
        "Please enter valid numbers for Loan Amount, Interest Rate, and Term.",
      );
      return null;
    }

    const computedResults = calculateLoanRepayment({
      principal: P,
      annualRatePercent: annualRate,
      termYears: years,
      frequency: frequency as LoanFrequency,
      extraPayment: extra,
      calcType,
    });

    setResults(computedResults);
    return computedResults;
  };

  const handleCalculate = () => {
    performCalculation();
  };

  // POST /v1/calculations (falls back to local history)
  const handleSaveCalculation = async () => {
    const currentResults = results || performCalculation();
    if (!currentResults) return;

    const currencySymbol = currency.split(" ")[0];
    const code = currency.startsWith("USD") ? "USD" : "AUD";
    const summary = `${frequency} Payment: ${currencySymbol}${currentResults.periodicPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const badge = title.trim() ? title : "Loan Scenario";
    const saved = await persistCalculatorResult({
      title: badge,
      type: "Loan",
      currency: code,
      displayType: calcType,
      summary,
      badge,
      inputs: {
        _tool: calcType,
        principal: loanAmount,
        annualRate: interestRate,
        termYears,
        frequency,
        extraPayment,
      },
      formula: currentResults.formula,
      result: {
        primaryLabel: `${frequency} payment`,
        primaryValue: currentResults.periodicPayment,
        primaryFormat: "money",
        formula: currentResults.formula,
        lines: [
          {
            label: "Periodic payment",
            value: currentResults.periodicPayment,
            format: "money",
          },
          {
            label: "Total repayments",
            value: currentResults.totalRepayments,
            format: "money",
          },
          {
            label: "Total interest",
            value: currentResults.totalInterest,
            format: "money",
          },
        ],
      },
      sharedWith: shareWith.trim() || undefined,
      savedBy: savedBy.trim() || undefined,
    });
    alert(
      saved.source === "api"
        ? "Saved to CRM calculations"
        : "Saved locally — sign in to sync with CRM",
    );
  };

  // Reset Form & Results
  const handleReset = () => {
    setLoanAmount("");
    setInterestRate("");
    setTermYears("");
    setExtraPayment("");
    setTitle("");
    setResults(null);
    setActivePreset(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Form Inputs & Formula */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-500"></span>{" "}
              Enter Values
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Currency
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
              >
                <option>AUD ($)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              Presets:
            </span>
            {PRESETS.map((preset) => {
              const active = activePreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  aria-pressed={active}
                  className={
                    active
                      ? "px-3 py-1 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium cursor-pointer"
                      : "px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                  }
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Calculator type *
              </label>
              <select
                value={calcType}
                onChange={(e) => {
                  setCalcType(e.target.value);
                  setResults(null);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option>Loan (Principal & Interest)</option>
                <option>Interest Only</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                <span>Loan amount</span>
                <span className="text-slate-400 dark:text-slate-500">
                  Max: $5,000,000
                </span>
              </div>
              <input
                type="number"
                placeholder="Enter the amount"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                <span>Annual Interest rate (%)</span>
                <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded text-[10px]">
                  Benchmark: 6.15%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="interest rate"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                  %
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                <span>Term (years)</span>
                <div className="flex gap-1">
                  <span
                    onClick={() => setTermYears("15")}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    15y
                  </span>
                  <span
                    onClick={() => setTermYears("20")}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    20y
                  </span>
                  <span
                    onClick={() => setTermYears("25")}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    25y
                  </span>
                  <span
                    onClick={() => setTermYears("30")}
                    className="text-[10px] bg-purple-600 px-1.5 py-0.5 rounded text-white font-medium cursor-pointer"
                  >
                    30y
                  </span>
                </div>
              </div>
              <input
                type="number"
                placeholder="enter the term"
                value={termYears}
                onChange={(e) => setTermYears(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Repayment frequency
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                {["Monthly", "Fortnightly", "Weekly"].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`flex-1 rounded-lg py-1.5 text-xs cursor-pointer transition ${
                      frequency === freq
                        ? "bg-purple-600 text-white font-medium shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                <span>Extra periodic payment</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  Accelerates payoff
                </span>
              </div>
              <input
                type="number"
                placeholder="e.g. 250"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Slider */}
          <div className="mb-6 mt-4">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span>Amount Slider</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${loanAmount ? Number(loanAmount).toLocaleString() : "0.00"}{" "}
                {currency.split(" ")[0]}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5000000"
              step="1000"
              value={loanAmount || 0}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full accent-purple-600 bg-slate-200 dark:bg-slate-700 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl text-xs transition shadow-md shadow-purple-600/20 cursor-pointer"
            >
              Calculate
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Formula & Logic Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Formula & Logic
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {parseLoanCalcType(calcType) === "io"
                ? "Interest-only (principal not amortized)"
                : "Standard Amortization Equation"}
            </span>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 p-3.5 rounded-xl text-xs text-purple-800 dark:text-purple-300 font-mono mb-4">
            {parseLoanCalcType(calcType) === "io"
              ? "Payment = P × r  (+ extra)"
              : "Payment = P × (r(1+r)^n) ÷ ((1+r)^n - 1)"}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-[10px] text-slate-400">
                Principal Base (P)
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {loanAmount ? `$${Number(loanAmount).toLocaleString()}` : "—"}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-[10px] text-slate-400">
                Periodic Rate (r)
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {results ? `${results.periodicRate.toFixed(6)}` : "—"}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-[10px] text-slate-400">
                Total Periods (n)
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {results ? `${results.totalPeriods} payments` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Results & Actions */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Output Result
            </span>
            <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <span
                className={`w-1.5 h-1.5 rounded-full ${results ? "bg-purple-600 dark:bg-purple-400 animate-pulse" : "bg-slate-400"}`}
              ></span>
              {results ? "Calculated" : "Waiting for input"}
            </span>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-5 mb-4">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              Estimated {frequency} Repayment
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-baseline gap-2">
              {results
                ? `$${results.periodicPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "$0.00"}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {currency.split(" ")[0]}
              </span>
            </div>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-2 flex items-center gap-1 font-medium">
              <span>⚡</span>{" "}
              {extraPayment
                ? `Includes extra payment buffer of $${Number(extraPayment).toLocaleString()}/mo`
                : "No extra buffer applied"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-[10px] text-slate-400">
                Total Repayments
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {results
                  ? `$${Math.round(results.totalRepayments).toLocaleString()}`
                  : "$0"}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Over {termYears || "0"} years
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-[10px] text-slate-400">
                Total Interest
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {results
                  ? `$${Math.round(results.totalInterest).toLocaleString()}`
                  : "$0"}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {results
                  ? `${results.interestPercentage.toFixed(1)}% of total`
                  : "0%"}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-purple-600"></span>{" "}
                Principal:{" "}
                {results ? `${results.principalPercentage.toFixed(1)}%` : "0%"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-rose-600"></span> Interest:{" "}
                {results ? `${results.interestPercentage.toFixed(1)}%` : "0%"}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-purple-600 h-full"
                style={{
                  width: results ? `${results.principalPercentage}%` : "0%",
                }}
              ></div>
              <div
                className="bg-rose-600 h-full"
                style={{
                  width: results ? `${results.interestPercentage}%` : "0%",
                }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                Term Accelerated
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {results && Number(extraPayment) > 0
                  ? parseLoanCalcType(calcType) === "io"
                    ? "Interest-only term is unchanged"
                    : `Saved ~${results.yearsSavedStr}`
                  : "No acceleration"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {results && Number(extraPayment) > 0
                  ? `+$${Math.round(results.interestSaved).toLocaleString()}`
                  : "$0"}
              </span>
              <span className="block text-[10px] text-slate-400">
                Interest Saved
              </span>
            </div>
          </div>
        </div>

        {/* Save & Share */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block mb-4">
            Save & Share
          </span>

          <div className="mb-3">
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Loan Calculation Scenario"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Saved by
              </label>
              <select
                value={savedBy}
                onChange={(e) => setSavedBy(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                { !saversReady ? (
                  <option value="">Loading team members…</option>
                ) : savers.length === 0 ? (
                  <option value="">No workspace members found</option>
                ) : (
                  savers.map((person) => (
                    <option key={person.id || person.email || person.name} value={person.name}>
                      {assignableOwnerLabel(person)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Share with
              </label>
              <select
                value={shareWith}
                onChange={(e) => setShareWith(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option>Sales team</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveCalculation}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-xl text-xs transition mb-2 shadow-md shadow-purple-600/20 cursor-pointer"
          >
            Save calculation
          </button>
          <button
            type="button"
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl text-xs transition border border-slate-200 dark:border-slate-700 cursor-pointer mb-3"
          >
            Export result
          </button>
          <button
            type="button"
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl text-xs transition border border-slate-200 dark:border-slate-700 cursor-pointer mb-3"
          >
            Share calculation
          </button>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Link directly to Estimate:
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-mono font-medium">
              EST-2026-0042
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
