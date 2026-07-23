"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, Receipt } from "lucide-react";
import {
  INVOICE_STATUSES,
  invoices as seed,
  listInvoices,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance/invoices/types";
import { formatAUD } from "@/lib/finance/shared";
import { INVOICE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
import { cn } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Invoice[]>(seed);
  const [statusTab, setStatusTab] = useState<InvoiceStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listInvoices());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      INVOICE_STATUSES.map((s) => [s, 0]),
    ) as Record<InvoiceStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.invoiceId.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function exportCsv() {
    const header = ["ID", "Title", "Client", "Status", "Due", "Total", "Paid", "Balance"];
    const body = filtered.map((r) =>
      [
        r.invoiceId,
        r.title,
        r.clientName,
        r.status,
        r.dueDate,
        r.total,
        r.amountPaid,
        r.amountDue,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FinanceOpsShell
      title="Sales invoices"
      section="§20.3"
      sectionIcon={Receipt}
      actions={
        <>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(
                "/finance/invoices/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </button>
        </>
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
          {INVOICE_STATUSES.map((s) => (
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
              {s} {counts[s]}
            </button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Due</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/finance/invoices/${r.id}`)}
                  className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.invoiceId}</div>
                    <div className="text-[11px] text-slate-500">{r.title}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.clientName}</td>
                  <td className="px-3 py-3 text-slate-600">{r.dueDate}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        INVOICE_STATUS_STYLE[r.status],
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">
                    {formatAUD(r.amountPaid)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatAUD(r.amountDue)}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No invoices match
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
    </FinanceOpsShell>
  );
}
