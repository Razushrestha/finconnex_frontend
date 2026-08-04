// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Home, ClipboardList, Plus, Search, ExternalLink } from "lucide-react";
// import {
//   FORM_STATUSES,
//   listMarketingForms,
//   marketingForms as seed,
//   type FormStatus,
//   type MarketingForm,
// } from "@/lib/marketing/forms/types";
// import { cn } from "@/lib/utils";

// const STATUS_STYLE: Record<FormStatus, string> = {
//   Draft: "bg-slate-100 text-slate-600",
//   Published: "bg-emerald-50 text-emerald-700",
//   Paused: "bg-amber-50 text-amber-800",
//   Archived: "bg-slate-100 text-slate-500",
// };

// export default function MarketingFormsPage() {
//   const router = useRouter();
//   const [rows, setRows] = useState<MarketingForm[]>(seed);
//   const [statusTab, setStatusTab] = useState<FormStatus | "All">("All");
//   const [search, setSearch] = useState("");

//   useEffect(() => {
//     setRows(listMarketingForms());
//   }, []);

//   const filtered = useMemo(() => {
//     let data = rows;
//     if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       data = data.filter(
//         (r) =>
//           r.name.toLowerCase().includes(q) ||
//           r.formId.toLowerCase().includes(q) ||
//           r.embedSlug.toLowerCase().includes(q),
//       );
//     }
//     return data;
//   }, [rows, statusTab, search]);

//   return (
//     <div className="relative min-h-full overflow-hidden bg-slate-50">
//       <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
//         <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
//           <div className="flex min-w-0 flex-wrap items-center gap-2">
//             <nav className="flex items-center gap-1 text-[10px] text-slate-400">
//               <Link
//                 href="/"
//                 className="flex items-center gap-0.5 hover:text-slate-600"
//               >
//                 <Home className="h-3 w-3" />
//                 Home
//               </Link>
//               <span>/</span>
//               <span className="text-slate-500">Marketing</span>
//               <span>/</span>
//             </nav>
//             <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
//               Forms
//             </h1>
//             <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
//               <ClipboardList className="h-2.5 w-2.5" />
//               §21
//             </span>
//           </div>
//           <button
//             type="button"
//             onClick={() =>
//               router.push(
//                 "/marketing/forms/create?layoutid=standard&redirect=false",
//               )
//             }
//             className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
//           >
//             <Plus className="h-3.5 w-3.5" />
//             New form
//           </button>
//         </div>

//         <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
//           <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
//             <div className="flex flex-wrap gap-0.5 rounded-lg bg-slate-50 p-0.5">
//               {(["All", ...FORM_STATUSES] as const).map((s) => (
//                 <button
//                   key={s}
//                   type="button"
//                   onClick={() => setStatusTab(s)}
//                   className={cn(
//                     "rounded-md px-2.5 py-1 text-[11px] font-semibold",
//                     statusTab === s
//                       ? "bg-white text-violet-700 shadow-sm"
//                       : "text-slate-500",
//                   )}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//             <div className="relative">
//               <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
//               <input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search…"
//                 className="h-8 w-44 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
//               />
//             </div>
//           </div>

//           <div className="min-h-0 flex-1 overflow-auto">
//             <table className="w-full min-w-[800px] text-left text-[12px]">
//               <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
//                 <tr>
//                   <th className="px-4 py-2.5">Form</th>
//                   <th className="px-4 py-2.5">Public URL</th>
//                   <th className="px-4 py-2.5">Routes to</th>
//                   <th className="px-4 py-2.5">Status</th>
//                   <th className="px-4 py-2.5">Fields</th>
//                   <th className="px-4 py-2.5">Submissions</th>
//                   <th className="px-4 py-2.5">Updated</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {filtered.map((f) => (
//                   <tr
//                     key={f.id}
//                     className="cursor-pointer hover:bg-violet-50/40"
//                     onClick={() => router.push(`/marketing/forms/${f.id}`)}
//                   >
//                     <td className="px-4 py-3">
//                       <p className="font-semibold text-slate-900">{f.name}</p>
//                       <p className="text-[11px] text-slate-400">{f.formId}</p>
//                     </td>
//                     <td className="px-4 py-3">
//                       <Link
//                         href={`/f/${f.embedSlug}`}
//                         target="_blank"
//                         onClick={(e) => e.stopPropagation()}
//                         className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-700 hover:underline"
//                       >
//                         /f/{f.embedSlug}
//                         <ExternalLink className="h-3 w-3" />
//                       </Link>
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
//                         {f.destination ?? "Lead"}
//                       </span>
//                       {f.journeyId ? (
//                         <span className="mt-0.5 block text-[10px] text-slate-400">
//                           + journey
//                         </span>
//                       ) : null}
//                     </td>
//                     <td className="px-4 py-3">
//                       <span
//                         className={cn(
//                           "rounded-full px-2 py-0.5 text-[10px] font-semibold",
//                           STATUS_STYLE[f.status],
//                         )}
//                       >
//                         {f.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 tabular-nums">{f.fields}</td>
//                     <td className="px-4 py-3 tabular-nums">{f.submissions}</td>
//                     <td className="px-4 py-3 text-slate-500">{f.updatedAt}</td>
//                   </tr>
//                 ))}
//                 {filtered.length === 0 ? (
//                   <tr>
//                     <td
//                       colSpan={7}
//                       className="px-4 py-16 text-center text-sm text-slate-400"
//                     >
//                       No forms match.
//                     </td>
//                   </tr>
//                 ) : null}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ExternalLink } from "lucide-react";
import {
  FORM_STATUSES,
  listMarketingForms,
  marketingForms as seed,
  type FormStatus,
  type MarketingForm,
} from "@/lib/marketing/forms/types";
import {
  CampaignHeader,
  StatusDropdown,
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from "@/components/marketing/index";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_STYLE: Record<FormStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Published: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
  Archived: "bg-slate-100 text-slate-500",
};

const columns: DataTableColumn<MarketingForm>[] = [
  {
    key: "name",
    header: "Form",
    className: "max-w-[220px]",
    render: (f) => (
      <>
        <p className="truncate text-[15px] font-semibold text-slate-900">
          {f.name}
        </p>
      </>
    ),
  },
  {
    key: "embedSlug",
    header: "Public URL",
    render: (f) => (
      <Link
        href={`/f/${f.embedSlug}`}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-mono text-[13px] text-violet-700 hover:underline"
      >
        /f/{f.embedSlug}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    ),
  },
  {
    key: "destination",
    header: "Routes to",
    render: (f) => (
      <>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-[12px] font-semibold text-violet-700">
          {f.destination ?? "Lead"}
        </span>
        {f.journeyId ? (
          <span className="mt-0.5 block text-[12px] text-slate-400">
            + journey
          </span>
        ) : null}
      </>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (f) => (
      <StatusBadge label={f.status} colorClassName={STATUS_STYLE[f.status]} />
    ),
  },
  {
    key: "fields",
    header: "Fields",
    className: "tabular-nums",
    render: (f) => f.fields,
  },
  {
    key: "submissions",
    header: "Submissions",
    className: "tabular-nums",
    render: (f) => f.submissions,
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "text-slate-500",
    render: (f) => f.updatedAt,
  },
];

export default function MarketingFormsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MarketingForm[]>(seed);
  const [statusTab, setStatusTab] = useState<FormStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listMarketingForms());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(FORM_STATUSES.map((s) => [s, 0])) as Record<
      FormStatus,
      number
    >;
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
          r.name.toLowerCase().includes(q) ||
          r.formId.toLowerCase().includes(q) ||
          r.embedSlug.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="relative min-h-full overflow-y-auto bg-slate-50">
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2 sm:p-4 lg:p-6">
        <CampaignHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Marketing" },
            { label: "Forms" },
          ]}
          title="Marketing"
          onCreate={() =>
            router.push(
              "/marketing/forms/create?layoutid=standard&redirect=false",
            )
          }
          createLabel="New form"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2">
          <StatusDropdown
            statuses={FORM_STATUSES}
            counts={counts}
            totalCount={rows.length}
            value={statusTab}
            onChange={setStatusTab}
          />
          <SearchInput value={search} onChange={setSearch} />
        </div>

        <DataTable
          columns={columns}
          rows={paginated}
          getRowKey={(f) => f.id}
          onRowClick={(f) => router.push(`/marketing/forms/${f.id}`)}
          page={safePage}
          pageSize={pageSize}
          totalCount={filtered.length}
          onPageChange={setPage}
          emptyState={
            <>
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              No forms match.
            </>
          }
        />
      </div>
    </div>
  );
}
