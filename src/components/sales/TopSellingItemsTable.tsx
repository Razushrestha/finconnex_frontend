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

type StockStatus = "Available" | "Not Available";

interface Product {
  orderId: string;
  productName: string;
  emoji: string;
  iconBgClass: string;
  stock: number;
  price: number;
  totalSale: number;
}

const products: Product[] = [
  {
    orderId: "#TXN10001",
    productName: "Smart Home Electronics Kit",
    emoji: "🔌",
    iconBgClass: "bg-sky-50",
    stock: 1200,
    price: 120.0,
    totalSale: 2499,
  },
  {
    orderId: "#TXN10002",
    productName: "Modern Wooden Office Chair",
    emoji: "🪑",
    iconBgClass: "bg-amber-50",
    stock: 1800,
    price: 145.5,
    totalSale: 3250,
  },
  {
    orderId: "#TXN10003",
    productName: "Luxury Fashion Hoodie Wear",
    emoji: "🧥",
    iconBgClass: "bg-rose-50",
    stock: 0,
    price: 125.5,
    totalSale: 5275,
  },
  {
    orderId: "#TXN10004",
    productName: "Organic Beauty Skincare Set",
    emoji: "🧴",
    iconBgClass: "bg-slate-50",
    stock: 1275,
    price: 75.5,
    totalSale: 7075,
  },
  {
    orderId: "#TXN10005",
    productName: "Professional Sports Fitness Gear",
    emoji: "🏋️",
    iconBgClass: "bg-indigo-50",
    stock: 0,
    price: 125.5,
    totalSale: 5275,
  },
];

function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return "Not Available";
  return "Available";
}

const statusStyles: Record<StockStatus, string> = {
  Available: "bg-emerald-50 text-emerald-600",
  "Not Available": "bg-rose-50 text-rose-500",
};

const columns = [
  { key: "orderId", label: "Order ID", sortable: false },
  { key: "productName", label: "Product Name", sortable: true },
  { key: "stock", label: "Stock", sortable: true },
  { key: "price", label: "Price", sortable: true },
  { key: "totalSale", label: "Total Sale", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "action", label: "Action", sortable: false },
] as const;

export function TopSellingItemsTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const totalEntries = 11;
  const totalPages = 3;

  const filtered = products.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Top Selling Items
        </h3>

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

      {/* Scrollable table */}
      <div className="overflow-x-auto pb-3 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="rounded-lg bg-slate-50 text-sm text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-4 py-2 font-medium ${
                    idx === 0 ? "rounded-l-lg" : ""
                  } ${idx === columns.length - 1 ? "rounded-r-lg" : ""}`}
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
            {filtered.map((product) => {
              const status = getStockStatus(product.stock);
              return (
                <tr
                  key={product.orderId}
                  className="border-b border-slate-50 text-sm last:border-b-0"
                >
                  <td className="px-4 py-2 font-medium text-slate-700">
                    {product.orderId}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${product.iconBgClass}`}
                      >
                        {product.emoji}
                      </span>
                      <span className="font-medium text-slate-700">
                        {product.productName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{product.stock}</td>
                  <td className="px-4 py-2 text-slate-500">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-700">
                    ${product.totalSale.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      aria-label={`Actions for ${product.orderId}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
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
