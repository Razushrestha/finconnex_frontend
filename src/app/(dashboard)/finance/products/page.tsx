"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Package } from "lucide-react";
import {
  PRODUCT_STATUSES,
  financeProducts as seed,
  listProducts,
  upsertProduct,
  type FinanceProduct,
  type ProductStatus,
} from "@/lib/finance/products/types";
import { formatAUD } from "@/lib/finance/shared";
import { PRODUCT_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FinanceProduct[]>(seed);
  const [statusTab, setStatusTab] = useState<ProductStatus | "All">("All");
  const [search, setSearch] = useState("");

  function refresh() {
    setRows(listProducts());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

  function toggleStatus(p: FinanceProduct) {
    upsertProduct({
      ...p,
      status: p.status === "Active" ? "Inactive" : "Active",
    });
    refresh();
  }

  return (
    <FinanceOpsShell
      title="Items / Services"
      section="§20.5"
      sectionIcon={Package}
      actions={
        <button
          type="button"
          onClick={() =>
            router.push(
              "/finance/products/create?layoutid=standard&redirect=false",
            )
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      }
    >
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusTab === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {PRODUCT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusTab === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s}
            </button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalogue…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">Tax</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-500">{r.sku}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.type}</td>
                  <td className="px-3 py-3 text-slate-600">{r.unit}</td>
                  <td className="px-3 py-3 text-slate-600">{r.taxRate}%</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(r)}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        PRODUCT_STATUS_STYLE[r.status],
                      )}
                      title="Toggle active"
                    >
                      {r.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatAUD(r.unitPrice)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No catalogue items
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
    </FinanceOpsShell>
  );
}
