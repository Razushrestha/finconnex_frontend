// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { Plus, Search, Download, FileText } from "lucide-react";
// import {
//   QUOTATION_STATUSES,
//   quotations as seed,
//   listQuotations,
//   type Quotation,
//   type QuotationStatus,
// } from "@/lib/finance/quotations/types";
// import { formatAUD } from "@/lib/finance/shared";
// import { QUOTATION_STATUS_STYLE } from "@/lib/finance/statusStyles";
// import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
// import { cn } from "@/lib/utils";

// export default function QuotationsPage() {
//   const router = useRouter();
//   const [rows, setRows] = useState<Quotation[]>(seed);
//   const [statusTab, setStatusTab] = useState<QuotationStatus | "All">("All");
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const pageSize = 8;

//   useEffect(() => {
//     setRows(listQuotations());
//   }, []);

//   useEffect(() => {
//     setPage(1);
//   }, [statusTab, search]);

//   const counts = useMemo(() => {
//     const map = Object.fromEntries(
//       QUOTATION_STATUSES.map((s) => [s, 0]),
//     ) as Record<QuotationStatus, number>;
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
//           r.quotationId.toLowerCase().includes(q) ||
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
//     const header = ["ID", "Title", "Client", "Status", "Owner", "Total"];
//     const body = filtered.map((r) =>
//       [r.quotationId, r.title, r.clientName, r.status, r.owner, r.total]
//         .map((c) => `"${String(c).replace(/"/g, '""')}"`)
//         .join(","),
//     );
//     const blob = new Blob([[header.join(","), ...body].join("\n")], {
//       type: "text/csv",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "quotations.csv";
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   return (
//     <FinanceOpsShell
//       title="Quotations"
//       section="§20.2"
//       sectionIcon={FileText}
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
//                 "/finance/quotations/create?layoutid=standard&redirect=false",
//               )
//             }
//             className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
//           >
//             <Plus className="h-3.5 w-3.5" />
//             New quotation
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
//           {QUOTATION_STATUSES.map((s) => (
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
//               placeholder="Search quotations…"
//               className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
//             />
//           </div>
//         </div>

//         <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
//           <table className="w-full text-left text-[12px]">
//             <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
//               <tr>
//                 <th className="px-4 py-2.5">Quotation</th>
//                 <th className="px-3 py-2.5">Client</th>
//                 <th className="px-3 py-2.5">Owner</th>
//                 <th className="px-3 py-2.5">E-Sign</th>
//                 <th className="px-3 py-2.5">Status</th>
//                 <th className="px-4 py-2.5 text-right">Total</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginated.map((r) => (
//                 <tr
//                   key={r.id}
//                   onClick={() => router.push(`/finance/quotations/${r.id}`)}
//                   className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
//                 >
//                   <td className="px-4 py-3">
//                     <div className="font-semibold text-slate-900">{r.quotationId}</div>
//                     <div className="text-[11px] text-slate-500">{r.title}</div>
//                   </td>
//                   <td className="px-3 py-3 text-slate-700">{r.clientName}</td>
//                   <td className="px-3 py-3 text-slate-600">{r.owner}</td>
//                   <td className="px-3 py-3 text-slate-600">
//                     {r.signatureStatus ?? ""}
//                   </td>
//                   <td className="px-3 py-3">
//                     <span
//                       className={cn(
//                         "rounded-full px-2 py-0.5 text-[9px] font-semibold",
//                         QUOTATION_STATUS_STYLE[r.status],
//                       )}
//                     >
//                       {r.status}
//                     </span>
//                   </td>
//                   <td className="px-4 py-3 text-right font-semibold text-slate-900">
//                     {formatAUD(r.total)}
//                   </td>
//                 </tr>
//               ))}
//               {paginated.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
//                     No quotations match
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

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from "@/components/finance/EntityHeader";
import { EntityCards } from "@/components/finance/EntityCards";
import { EntityTable } from "@/components/finance/EntityTable";
import { EntityFilters } from "@/components/finance/EntityFilters";
import { MetricCardConfig, TableColumn } from "@/components/finance/types";
import {
  quotations,
  Quotation,
  QuotationStatus,
} from "@/lib/finance/quotations/types";

interface QuotationRow {
  id: string;
  quotationId: string;
  clientName: string;
  clientInitials: string;
  issueDate: string;
  totalValue: string;
  status: QuotationStatus;
}

export const QuotationsPage: React.FC = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("30d");
  const [data] = useState<Quotation[]>(quotations);

  const tableData: QuotationRow[] = data.map((item) => ({
    id: item.id, // Real unique ID for router.push (`quo1`, `quo2`, etc.)
    quotationId: item.quotationId, // Display code (`QUO-3101`)
    clientName: item.clientName,
    clientInitials: item.clientName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    issueDate: item.validUntil,
    totalValue: `$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    status: item.status,
  }));

  // Filter based on search input and status dropdown
  const filteredData = tableData.filter((item) => {
    const matchesSearch =
      item.quotationId.toLowerCase().includes(search.toLowerCase()) ||
      item.clientName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const headerProps = {
    title: "Quotations",
    description: "Manage and track your active quotes.",
    searchValue: "",
    onSearchChange: () => {},
    actionLabel: "Create Quote",
    onActionClick: () => console.log("Open Create Quote Modal"),
  };

  const cardsData: MetricCardConfig[] = [
    {
      title: "PENDING VALUE",
      value: "$45,230",
      subtext: "📈 +12% vs last month",
      subtextVariant: "default",
    },
    {
      title: "APPROVED THIS MONTH",
      value: "18",
      subtext: "🎯 82% conversion rate",
      subtextVariant: "default",
    },
    {
      title: "ACTION REQUIRED",
      value: "3",
      subtext: "⚠️ Expiring within 48h",
      subtextVariant: "destructive",
    },
  ];

  const columns: TableColumn<QuotationRow>[] = [
    {
      header: "QUOTE ID",
      accessorKey: "quotationId",
      cell: (row) => (
        <span className="text-primary font-semibold">{row.quotationId}</span>
      ),
    },
    {
      header: "CLIENT NAME",
      accessorKey: "clientName",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
            {row.clientInitials}
          </span>
          <span>{row.clientName}</span>
        </div>
      ),
    },
    { header: "ISSUE DATE", accessorKey: "issueDate" },
    { header: "TOTAL VALUE", accessorKey: "totalValue" },
    {
      header: "STATUS",
      accessorKey: "status",
      cell: (row) => {
        const styles =
          row.status === "Accepted"
            ? "bg-primary/10 text-primary"
            : row.status === "Rejected" || row.status === "Expired"
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

  return (
    <div className="w-full min-h-full h-auto bg-background/95 text-foreground p-6 overflow-y-auto pb-16">
      <EntityHeader {...headerProps} />
      <EntityCards cards={cardsData} />

      <EntityFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by Quote ID or Client..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateValue={dateFilter}
        onDateChange={setDateFilter}
        statusOptions={[
          { label: "All", value: "All" },
          { label: "Draft", value: "Draft" },
          { label: "Sent", value: "Sent" },
          { label: "Accepted", value: "Accepted" },
          { label: "Rejected", value: "Rejected" },
          { label: "Expired", value: "Expired" },
        ]}
      />

      <EntityTable
        columns={columns}
        data={filteredData}
        paginationText={`Showing 1 to ${filteredData.length} of ${tableData.length} entries`}
        onRowClick={(row) => router.push(`/finance/quotations/${row.id}`)}
      />
    </div>
  );
};

export default QuotationsPage;
