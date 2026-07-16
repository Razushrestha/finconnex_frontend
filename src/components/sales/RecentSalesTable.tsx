"use client";

import { useState } from "react";
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type PaymentMethod = "Debit Card" | "UPI" | "Credit Card" | "Wallet";
type OrderStatus = "Completed" | "Pending" | "Cancelled" | "Processing";

interface Sale {
  orderId: string;
  customerName: string;
  initials: string;
  avatarColorClass: string;
  product: string;
  amount: number;
  payment: PaymentMethod;
  status: OrderStatus;
}

const sales: Sale[] = [
  {
    orderId: "#TXN10234",
    customerName: "Emma Johnson",
    initials: "EJ",
    avatarColorClass: "bg-sky-100 text-sky-600",
    product: "Wireless Headphones",
    amount: 2499,
    payment: "Debit Card",
    status: "Completed",
  },
  {
    orderId: "#TXN10235",
    customerName: "Liam Smith",
    initials: "LS",
    avatarColorClass: "bg-amber-100 text-amber-600",
    product: "Smart Watch",
    amount: 3299,
    payment: "UPI",
    status: "Pending",
  },
  {
    orderId: "#TXN10236",
    customerName: "Olivia Brown",
    initials: "OB",
    avatarColorClass: "bg-rose-100 text-rose-600",
    product: "Laptop Sleeve",
    amount: 1249,
    payment: "Credit Card",
    status: "Completed",
  },
  {
    orderId: "#TXN10237",
    customerName: "Noah Davis",
    initials: "ND",
    avatarColorClass: "bg-emerald-100 text-emerald-600",
    product: "Bluetooth Speaker",
    amount: 2799,
    payment: "Wallet",
    status: "Cancelled",
  },
  {
    orderId: "#TXN10238",
    customerName: "Sophia Wilson",
    initials: "SW",
    avatarColorClass: "bg-violet-100 text-violet-600",
    product: "DSLR Camera",
    amount: 45499,
    payment: "UPI",
    status: "Processing",
  },
];

const statusStyles: Record<OrderStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Pending: "bg-amber-50 text-amber-600",
  Cancelled: "bg-rose-50 text-rose-500",
  Processing: "bg-indigo-50 text-indigo-500",
};

const columns = [
  { key: "orderId", label: "Order ID", sortable: true },
  { key: "customerName", label: "Customer Name", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "amount", label: "Amount", sortable: true },
  { key: "payment", label: "Payment", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "action", label: "Action", sortable: false },
] as const;

export function RecentSalesTable() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const totalEntries = 10;
  const totalPages = 2;

  const filtered = sales.filter((s) =>
    s.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  const allSelected = selected.size === filtered.length && filtered.length > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.orderId)));
    }
  }

  function toggleRow(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-md font-bold text-slate-900">Recent Sales</h3>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="overflow-x-auto pb-3 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="rounded-lg bg-slate-50 text-sm text-slate-500">
              <th className="rounded-l-lg py-2 pl-4 pr-2 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                />
              </th>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium ${
                    idx === columns.length - 1 ? "rounded-r-lg" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <button
                        type="button"
                        aria-label={`Sort by ${col.label}`}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((sale) => (
              <tr
                key={sale.orderId}
                className="border-b border-slate-50 text-sm last:border-b-0"
              >
                <td className="py-2 pl-4 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.has(sale.orderId)}
                    onChange={() => toggleRow(sale.orderId)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {sale.orderId}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${sale.avatarColorClass}`}
                    >
                      {sale.initials}
                    </span>
                    <span className="font-medium text-slate-700">
                      {sale.customerName}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500">{sale.product}</td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  ${sale.amount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-500">{sale.payment}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusStyles[sale.status]}`}
                  >
                    {sale.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    aria-label={`Actions for ${sale.orderId}`}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing 1 to {filtered.length} of {totalEntries} entries
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="First page"
            disabled={page === 1}
            onClick={() => setPage(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                page === p
                  ? "bg-indigo-500 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
