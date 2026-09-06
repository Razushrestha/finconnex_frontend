"use client";

import React, { useState } from "react";
import { Search, Download, FileText, Plus } from "lucide-react";

interface Invoice {
  id: string;
  date: string;
  desc: string;
  amount: string;
  method: string;
  status: string;
  paidDate: string;
}

interface InvoicesTableProps {
  invoices?: Invoice[];
  onAddInvoice?: () => void;
}

export function InvoicesTable({
  invoices = [],
  onAddInvoice,
}: InvoicesTableProps) {
  const [filter, setFilter] = useState("All (0)");
  const [searchQuery, setSearchQuery] = useState("");

  const filterTabs = ["All (0)", "Paid (0)", "Pending (0)", "Overdue (0)"];

  // Filter logic can be wired up with Redux state later
  const displayInvoices = invoices;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filter === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-52"
            />
          </div>
          <button
            type="button"
            onClick={onAddInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-primary-foreground bg-primary hover:opacity-90 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-3">Invoice ID</th>
              <th className="py-3 px-3">Issue Date</th>
              <th className="py-3 px-3">Description</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Payment Method</th>
              <th className="py-3 px-3">Status / Paid Date</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {displayInvoices.length > 0 ? (
              displayInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3.5 px-3 font-bold text-primary whitespace-nowrap">
                    {inv.id}
                  </td>
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    {inv.date}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-foreground min-w-[200px]">
                    {inv.desc}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-foreground whitespace-nowrap">
                    {inv.amount}
                  </td>
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    {inv.method}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {inv.status}
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    Actions
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No invoices generated yet. Click{" "}
                  <span className="font-semibold text-foreground">
                    &quot;Add Invoice&quot;
                  </span>{" "}
                  to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
