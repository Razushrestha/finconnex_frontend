"use client";

import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const DUMMY_DATA = [
  {
    id: 1,
    name: "Ava Martinez",
    initials: "AM",
    date: "23 Oct 2025",
    desc: "Software Subscription",
    cat: "Expense",
    amount: "-$89",
    status: "Pending",
    statusColor: "bg-amber-50 text-amber-600",
  },
  {
    id: 2,
    name: "Emma Johnson",
    initials: "EJ",
    date: "28 Oct 2025",
    desc: "Client Payment - Alpha",
    cat: "Revenue",
    amount: "+$2,500",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 3,
    name: "Ethan Davis",
    initials: "ED",
    date: "22 Oct 2025",
    desc: "Consulting Income",
    cat: "Revenue",
    amount: "+$800",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 4,
    name: "Isabella Moore",
    initials: "IM",
    date: "28 Oct 2025",
    desc: "Client Payment - Alpha",
    cat: "Revenue",
    amount: "+$2,500",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 5,
    name: "James Miller",
    initials: "JM",
    date: "26 Oct 2025",
    desc: "Office Rent",
    cat: "Expense",
    amount: "-$1,200",
    status: "Paid",
    statusColor: "bg-rose-50 text-rose-600",
  },
  {
    id: 6,
    name: "Lucas Brown",
    initials: "LB",
    date: "15 Oct 2025",
    desc: "Server Hosting",
    cat: "Expense",
    amount: "-$300",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 7,
    name: "Sophia Wilson",
    initials: "SW",
    date: "12 Oct 2025",
    desc: "Design Assets",
    cat: "Expense",
    amount: "-$150",
    status: "Pending",
    statusColor: "bg-amber-50 text-amber-600",
  },
  {
    id: 8,
    name: "Oliver Taylor",
    initials: "OT",
    date: "10 Oct 2025",
    desc: "Ad Campaign",
    cat: "Revenue",
    amount: "+$4,000",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 9,
    name: "Mia Anderson",
    initials: "MA",
    date: "08 Oct 2025",
    desc: "Refund",
    cat: "Revenue",
    amount: "+$200",
    status: "Paid",
    statusColor: "bg-rose-50 text-rose-600",
  },
  {
    id: 10,
    name: "Noah Thomas",
    initials: "NT",
    date: "05 Oct 2025",
    desc: "API Subscription",
    cat: "Expense",
    amount: "-$50",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 11,
    name: "Amelia White",
    initials: "AW",
    date: "02 Oct 2025",
    desc: "Consulting",
    cat: "Revenue",
    amount: "+$1,500",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 12,
    name: "Mason Clark",
    initials: "MC",
    date: "01 Oct 2025",
    desc: "Maintenance",
    cat: "Expense",
    amount: "-$450",
    status: "Pending",
    statusColor: "bg-amber-50 text-amber-600",
  },
];

const columns = ["Name", "Date", "Description", "Category", "Amount", "Status"];

export function RecentTransactionsTable() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = DUMMY_DATA.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          Recent Transactions
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3 sm:h-4 sm:w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search"
            className="w-40 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56 sm:py-2 sm:pl-10 sm:pr-4 sm:text-sm"
          />
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto pb-2 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="rounded-lg bg-slate-50 text-slate-500">
              {columns.map((h, idx) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 font-medium ${
                    idx === 0 ? "rounded-l-lg" : ""
                  } ${idx === columns.length - 1 ? "rounded-r-lg" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 last:border-b-0"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-600">
                      {t.initials}
                    </span>
                    <span className="font-medium text-slate-700">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">{t.date}</td>
                <td className="px-4 py-2 text-slate-500">{t.desc}</td>
                <td className="px-4 py-2 text-slate-500">{t.cat}</td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    t.amount.startsWith("+")
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {t.amount}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${t.statusColor}`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No transactions match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500 sm:text-sm">
          Showing{" "}
          {filtered.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(safePage * itemsPerPage, filtered.length)} of{" "}
          {filtered.length} entries
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-label="First page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
          >
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setCurrentPage(p)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium sm:h-8 sm:w-8 ${
                safePage === p
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
