// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { Plus, Search, Download, Receipt } from "lucide-react";
// import {
//   INVOICE_STATUSES,
//   invoices as seed,
//   listInvoices,
//   type Invoice,
//   type InvoiceStatus,
// } from "@/lib/finance/invoices/types";
// import { formatAUD } from "@/lib/finance/shared";
// import { INVOICE_STATUS_STYLE } from "@/lib/finance/statusStyles";
// import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
// import { cn } from "@/lib/utils";

// export default function InvoicesPage() {
//   const router = useRouter();
//   const [rows, setRows] = useState<Invoice[]>(seed);
//   const [statusTab, setStatusTab] = useState<InvoiceStatus | "All">("All");
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const pageSize = 8;

//   useEffect(() => {
//     setRows(listInvoices());
//   }, []);

//   useEffect(() => {
//     setPage(1);
//   }, [statusTab, search]);

//   const counts = useMemo(() => {
//     const map = Object.fromEntries(
//       INVOICE_STATUSES.map((s) => [s, 0]),
//     ) as Record<InvoiceStatus, number>;
//     for (const r of rows) map[r.status] += 1;
//     return map;
//   }, [rows]);

//   const filtered = useMemo(() => {
//     let data = rows;
//     if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       data = data.filter(
//         (r) =>
//           r.title.toLowerCase().includes(q) ||
//           r.invoiceId.toLowerCase().includes(q) ||
//           r.clientName.toLowerCase().includes(q) ||
//           r.owner.toLowerCase().includes(q),
//       );
//     }
//     return data;
//   }, [rows, statusTab, search]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//   const safePage = Math.min(page, totalPages);
//   const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

//   function exportCsv() {
//     const header = ["ID", "Title", "Client", "Status", "Due", "Total", "Paid", "Balance"];
//     const body = filtered.map((r) =>
//       [
//         r.invoiceId,
//         r.title,
//         r.clientName,
//         r.status,
//         r.dueDate,
//         r.total,
//         r.amountPaid,
//         r.amountDue,
//       ]
//         .map((c) => `"${String(c).replace(/"/g, '""')}"`)
//         .join(","),
//     );
//     const blob = new Blob([[header.join(","), ...body].join("\n")], {
//       type: "text/csv",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "invoices.csv";
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   return (
//     <FinanceOpsShell
//       title="Sales invoices"
//       section="§20.3"
//       sectionIcon={Receipt}
//       actions={
//         <>
//           <button
//             type="button"
//             onClick={exportCsv}
//             className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
//           >
//             <Download className="h-3.5 w-3.5" />
//             Export
//           </button>
//           <button
//             type="button"
//             onClick={() =>
//               router.push(
//                 "/finance/invoices/create?layoutid=standard&redirect=false",
//               )
//             }
//             className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
//           >
//             <Plus className="h-3.5 w-3.5" />
//             New invoice
//           </button>
//         </>
//       }
//     >

//         <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
//           <button
//             type="button"
//             onClick={() => setStatusTab("All")}
//             className={cn(
//               "rounded-full px-2.5 py-1 text-[10px] font-semibold",
//               statusTab === "All"
//                 ? "bg-violet-600 text-white"
//                 : "bg-white text-slate-600 ring-1 ring-slate-200",
//             )}
//           >
//             All {rows.length}
//           </button>
//           {INVOICE_STATUSES.map((s) => (
//             <button
//               key={s}
//               type="button"
//               onClick={() => setStatusTab(s)}
//               className={cn(
//                 "rounded-full px-2.5 py-1 text-[10px] font-semibold",
//                 statusTab === s
//                   ? "bg-violet-600 text-white"
//                   : "bg-white text-slate-600 ring-1 ring-slate-200",
//               )}
//             >
//               {s} {counts[s]}
//             </button>
//           ))}
//           <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
//             <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
//             <input
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search invoices…"
//               className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
//             />
//           </div>
//         </div>

//         <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
//           <table className="w-full text-left text-[12px]">
//             <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
//               <tr>
//                 <th className="px-4 py-2.5">Invoice</th>
//                 <th className="px-3 py-2.5">Client</th>
//                 <th className="px-3 py-2.5">Due</th>
//                 <th className="px-3 py-2.5">Status</th>
//                 <th className="px-3 py-2.5 text-right">Paid</th>
//                 <th className="px-4 py-2.5 text-right">Balance</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginated.map((r) => (
//                 <tr
//                   key={r.id}
//                   onClick={() => router.push(`/finance/invoices/${r.id}`)}
//                   className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
//                 >
//                   <td className="px-4 py-3">
//                     <div className="font-semibold text-slate-900">{r.invoiceId}</div>
//                     <div className="text-[11px] text-slate-500">{r.title}</div>
//                   </td>
//                   <td className="px-3 py-3 text-slate-700">{r.clientName}</td>
//                   <td className="px-3 py-3 text-slate-600">{r.dueDate}</td>
//                   <td className="px-3 py-3">
//                     <span
//                       className={cn(
//                         "rounded-full px-2 py-0.5 text-[9px] font-semibold",
//                         INVOICE_STATUS_STYLE[r.status],
//                       )}
//                     >
//                       {r.status}
//                     </span>
//                   </td>
//                   <td className="px-3 py-3 text-right text-slate-600">
//                     {formatAUD(r.amountPaid)}
//                   </td>
//                   <td className="px-4 py-3 text-right font-semibold text-slate-900">
//                     {formatAUD(r.amountDue)}
//                   </td>
//                 </tr>
//               ))}
//               {paginated.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
//                     No invoices match
//                   </td>
//                 </tr>
//               ) : null}
//             </tbody>
//           </table>
//           <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
//             <span>
//               {filtered.length} result{filtered.length === 1 ? "" : "s"}
//             </span>
//             <div className="flex items-center gap-1.5">
//               <button
//                 type="button"
//                 disabled={safePage <= 1}
//                 onClick={() => setPage((p) => p - 1)}
//                 className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
//               >
//                 Prev
//               </button>
//               <span>
//                 {safePage} / {totalPages}
//               </span>
//               <button
//                 type="button"
//                 disabled={safePage >= totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//                 className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         </div>
//     </FinanceOpsShell>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from "@/components/finance/EntityHeader";
import { EntityCards } from "@/components/finance/EntityCards";
import { EntityTable } from "@/components/finance/EntityTable";
import { EntityFilters } from "@/components/finance/EntityFilters";
import { MetricCardConfig, TableColumn } from "@/components/finance/types";
import {
  listInvoices,
  Invoice,
  InvoiceStatus,
} from "@/lib/finance/invoices/types";
import { useCrmInvoices } from "@/lib/finance/invoices/use-crm-invoices";
import { formatAUD } from "@/lib/finance/shared";
import { cn } from "@/lib/utils";

interface InvoiceRow {
  id: string;
  invoiceId: string;
  title: string;
  clientName: string;
  dueDate: string;
  status: InvoiceStatus;
  amountPaid: string;
  amountDue: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const crm = useCrmInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [data, setData] = useState<Invoice[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    setData(listInvoices());
  }, [crm.source, crm.loading]);

  // Filter based on search input and status dropdown
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.owner.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // 1. Configure Header Data
  const headerProps = {
    title: "Sales invoices",
    description: "Manage and track your active sales invoices.",
    searchPlaceholder: "Search Invoices...",
    searchValue: "",
    onSearchChange: () => {},
    actionLabel: "New invoice",
    onActionClick: () =>
      router.push("/finance/invoices/create?layoutid=standard&redirect=false"),
  };

  // 2. Configure Cards Data
  const totalDueValue = data
    .filter((inv) => inv.status !== "Paid" && inv.status !== "Void")
    .reduce((acc, curr) => acc + curr.amountDue, 0);

  const paidCount = data.filter((inv) => inv.status === "Paid").length;

  const cardsData: MetricCardConfig[] = [
    {
      title: "OUTSTANDING BALANCE",
      value: formatAUD(totalDueValue),
      subtext: "📈 Total unpaid receivable",
      subtextVariant: "default",
    },
    {
      title: "PAID INVOICES",
      value: paidCount,
      subtext: "🎯 Successfully settled",
      subtextVariant: "success",
    },
    {
      title: "TOTAL INVOICES",
      value: data.length,
      subtext: crm.source === "api" ? "📋 Live CRM" : "📋 Tracked in system",
      subtextVariant: "default",
    },
  ];

  // 3. Configure Table Columns & Data
  const columns: TableColumn<InvoiceRow>[] = [
    {
      header: "INVOICE",
      accessorKey: "invoiceId",
      cell: (row) => (
        <div>
          <span className="text-primary font-semibold">{row.invoiceId}</span>
          <p className="text-[11px] text-muted-foreground">{row.title}</p>
        </div>
      ),
    },
    {
      header: "CLIENT",
      accessorKey: "clientName",
      cell: (row) => (
        <span className="font-medium text-foreground">{row.clientName}</span>
      ),
    },
    {
      header: "DUE",
      accessorKey: "dueDate",
    },
    {
      header: "STATUS",
      accessorKey: "status",
      cell: (row) => {
        const styles =
          row.status === "Paid"
            ? "bg-primary/10 text-primary"
            : row.status === "Overdue" || row.status === "Void"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground";
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${styles}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      header: "PAID",
      accessorKey: "amountPaid",
      cell: (row) => (
        <span className="text-muted-foreground">{row.amountPaid}</span>
      ),
    },
    {
      header: "BALANCE",
      accessorKey: "amountDue",
      cell: (row) => (
        <span className="font-semibold text-foreground">{row.amountDue}</span>
      ),
    },
    {
      header: "ACTIONS",
      accessorKey: "id",
      cell: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log("Action menu clicked");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          ⋮
        </button>
      ),
    },
  ];

  const tableData: InvoiceRow[] = filteredData.map((item) => ({
    id: item.id,
    invoiceId: item.invoiceId,
    title: item.title,
    clientName: item.clientName,
    dueDate: item.dueDate,
    status: item.status,
    amountPaid: formatAUD(item.amountPaid),
    amountDue: formatAUD(item.amountDue),
  }));

  return (
    <div className="h-auto min-h-full w-full overflow-y-auto bg-slate-50 p-6 pb-16 text-slate-900">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crm.source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crm.source === "api"
            ? "Live CRM"
            : crm.loading
              ? "Connecting…"
              : "Demo"}
        </span>
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
      <EntityHeader {...headerProps} />
      <EntityCards cards={cardsData} />
      <EntityFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoices..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateValue={dateFilter}
        onDateChange={setDateFilter}
        statusOptions={[
          { label: "All", value: "All" },
          { label: "Draft", value: "Draft" },
          { label: "Sent", value: "Sent" },
          { label: "Partially Paid", value: "Partially Paid" },
          { label: "Paid", value: "Paid" },
          { label: "Overdue", value: "Overdue" },
          { label: "Cancelled", value: "Cancelled" },
          { label: "Void", value: "Void" },
        ]}
      />
      <EntityTable
        columns={columns}
        data={tableData}
        paginationText={`Showing 1 to ${tableData.length} of ${data.length} entries`}
        onRowClick={(row) => router.push(`/finance/invoices/${row.id}`)}
      />
    </div>
  );
}
