"use client";

import React, { useState } from "react";

export function FinancialBillingSection() {
  const [frequency, setFrequency] = useState("monthly");
  const [automateInvoices, setAutomateInvoices] = useState(true);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs">
            3
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Financial & Billing Parameters
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Recurring billing schedule & payment gateway terms
        </span>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
          Billing Frequency
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 bg-muted/40 p-1 rounded-xl border border-border">
          {[
            { id: "monthly", label: "Monthly Retainer" },
            { id: "quarterly", label: "Quarterly Invoiced" },
            { id: "bimonthly", label: "Bi-monthly" },
            { id: "annual", label: "Annual Upfront" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFrequency(tab.id)}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                frequency === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Agreement / Retainer Value
          </label>
          <div className="relative">
            <input
              type="text"
              defaultValue="$ 3,500.00"
              className="w-full pl-6 pr-12 py-2 bg-background border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-violet-500"
            />
            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">
              $
            </span>
            <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground">
              / mo
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Tax Calculation
          </label>
          <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500">
            <option>GST (10.0%) - Included</option>
            <option>GST (10.0%) - Exclusive</option>
            <option>Tax Exempt</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Payment Terms
          </label>
          <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500">
            <option>Net 14 Days (Invoice)</option>
            <option>Net 30 Days (Invoice)</option>
            <option>Immediate / Due on Receipt</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-500/10 text-violet-600 rounded-lg">
            💳
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              Automate recurring tax invoices
            </p>
            <p className="text-[11px] text-muted-foreground">
              Generate and transmit invoice automatically 5 days prior to period
              start.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAutomateInvoices(!automateInvoices)}
          className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
            automateInvoices ? "bg-violet-600" : "bg-muted-foreground/30"
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              automateInvoices ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
