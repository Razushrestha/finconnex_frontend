// import type { Metadata } from "next";
// import { CalculatorWorkspaceClient } from "@/components/calculator/CalculatorWorkspaceClient";

// export const metadata: Metadata = {
//   title: "Calculator: FinConnex",
//   description: "Built-in calculators for commissions, loans, tax, and more.",
// };

// export default function CalculatorPage() {
//   return <CalculatorWorkspaceClient />;
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoanRepaymentsView from "@/components/calculator/LoanRepaymentsView";
import BorrowingCapacityView from "@/components/calculator/BorrowingCapacityView";
import StampDutyFeesView from "@/components/calculator/StampDutyFeesView";
import { Calculator, TrendingUp, FileText, History, Plus } from "lucide-react";

export default function FinancialCalculatorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "repayments" | "capacity" | "stampDuty"
  >("repayments");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
      {/* Top Header & Breadcrumb */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div></div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/calculator/history")}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition shadow-xs cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-500" /> History{" "}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Tab Bar */}
      <div className="max-w-7xl mx-auto mb-6 border-b border-slate-200 pb-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("repayments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "repayments"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calculator className="w-4 h-4" /> Loan Repayments
        </button>
        <button
          onClick={() => setActiveTab("capacity")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "capacity"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Borrowing Capacity
        </button>
        <button
          onClick={() => setActiveTab("stampDuty")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "stampDuty"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" /> Stamp Duty & Fees
        </button>
      </div>

      {/* Dynamic Screen View Rendering */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "repayments" && <LoanRepaymentsView />}
        {activeTab === "capacity" && <BorrowingCapacityView />}
        {activeTab === "stampDuty" && <StampDutyFeesView />}
      </div>
    </div>
  );
}
