"use client";

import React, { useState } from "react";
import {
  Calculator,
  Building2,
  MapPin,
  UserCheck,
  Receipt,
  Info,
} from "lucide-react";

export default function StampDutyFeesView() {
  // Form input states
  const [purchasePrice, setPurchasePrice] = useState("");
  const [stateTerritory, setStateTerritory] = useState("NSW - New South Wales");
  const [buyerType, setBuyerType] = useState(
    "Owner Occupier (Principal Place)",
  );
  const [propertyCategory, setPropertyCategory] = useState(
    "Established Residential Home",
  );

  // Calculated results state (null until calculated)
  const [results, setResults] = useState<{
    stampDuty: number;
    transferFee: number;
    mortgageFee: number;
    totalFees: number;
  } | null>(null);

  // Calculation Logic for Stamp Duty & Government Charges
  const performCalculation = () => {
    const price = parseFloat(purchasePrice) || 0;
    if (price <= 0) {
      alert("Please enter a valid property purchase price.");
      return null;
    }

    let duty = 0;

    if (stateTerritory.includes("NSW")) {
      // Standard NSW Transfer Duty Brackets (Approximate statutory progression)
      if (price <= 160000) {
        duty = price * 0.0125;
      } else if (price <= 350000) {
        duty = 2000 + (price - 160000) * 0.015;
      } else if (price <= 650000) {
        duty = 4850 + (price - 350000) * 0.035;
      } else if (price <= 1133000) {
        duty = 15350 + (price - 650000) * 0.045;
      } else {
        duty = 37185 + (price - 1133000) * 0.055;
      }
    } else if (stateTerritory.includes("VIC")) {
      duty = price * 0.055;
    } else {
      duty = price * 0.035;
    }

    // Buyer Type Adjustments
    if (buyerType === "First Home Buyer") {
      if (stateTerritory.includes("NSW") && price <= 650000) {
        duty = 0; // FHB full exemption threshold benchmark
      } else if (stateTerritory.includes("NSW") && price <= 800000) {
        // Concessional sliding scale bracket approximation
        const discountFactor = (800000 - price) / 150000;
        duty = duty * Math.max(0, 1 - discountFactor);
      }
    } else if (buyerType === "Investor") {
      duty *= 1.05; // Surcharge factor
    }

    // Fixed / Tiered Statutory Registration Fees (Standardized Caps)
    const transferFee = price <= 50000 ? 220 : 310;
    const mortgageFee = 154;
    const totalFees = duty + transferFee + mortgageFee;

    const computedResults = {
      stampDuty: Math.max(0, duty),
      transferFee: Math.round(transferFee),
      mortgageFee,
      totalFees: Math.round(totalFees),
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
      type: "Stamp Duty & Fees",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      inputs: {
        "Purchase Price": `$${Number(purchasePrice).toLocaleString()}`,
        State: stateTerritory.split(" - ")[0],
        "Buyer Type": buyerType,
        Category: propertyCategory,
      },
      summary: `Total Fees: $${currentResults.totalFees.toLocaleString()} AUD`,
      badge: "Govt Charges",
    };

    try {
      const existing = localStorage.getItem("calc_history");
      const historyArray = existing ? JSON.parse(existing) : [];
      const updatedHistory = [newRecord, ...historyArray];
      localStorage.setItem("calc_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Failed to save stamp duty history:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Form */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-500"></span>{" "}
              Property Purchase Details
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              State Statutory Rates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Property Purchase Price *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 750000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                State / Territory
              </label>
              <select
                value={stateTerritory}
                onChange={(e) => setStateTerritory(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
              >
                <option>NSW - New South Wales</option>
                <option>VIC - Victoria</option>
                <option>QLD - Queensland</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Buyer Type
              </label>
              <select
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
              >
                <option>Owner Occupier (Principal Place)</option>
                <option>First Home Buyer</option>
                <option>Investor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Property Category
              </label>
              <select
                value={propertyCategory}
                onChange={(e) => setPropertyCategory(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
              >
                <option>Established Residential Home</option>
                <option>Vacant Land</option>
                <option>Commercial Property</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-xl text-xs transition shadow-md shadow-purple-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculate Stamp Duty
          </button>
        </div>
      </div>

      {/* Right Results */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full transition-colors">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Total Government Charges
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full font-medium">
                {stateTerritory.split(" - ")[0]} Rates
              </span>
            </div>

            <div className="bg-gradient-to-br from-purple-50/70 to-white dark:from-purple-950/40 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-5 mb-5 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Estimated Total Government Fees
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-baseline gap-2">
                {results ? `$${results.totalFees.toLocaleString()}` : "$0"}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  AUD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3 text-purple-500 shrink-0" />
                {results
                  ? "Payable at settlement directly to State Revenue Office."
                  : "Enter purchase price and click calculate."}
              </p>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">
                State Transfer Stamp Duty
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {results
                  ? `$${Math.round(results.stampDuty).toLocaleString()}`
                  : "$0"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">
                Transfer Registration Fee
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {results ? `$${results.transferFee.toLocaleString()}` : "$0"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Mortgage Registration Fee
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {results ? `$${results.mortgageFee.toLocaleString()}` : "$0"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
