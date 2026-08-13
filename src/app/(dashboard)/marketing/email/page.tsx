// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//   Home,
//   Plus,
//   Search,
//   Mail,
//   Download,
//   Megaphone,
//   Filter,
//   ChevronDown,
//   Check,
// } from "lucide-react";
// import {
//   EMAIL_CAMPAIGN_STATUSES,
//   EMAIL_CAMPAIGN_TYPES,
//   clickRate,
//   emailCampaigns as seed,
//   listEmailCampaigns,
//   openRate,
//   type EmailCampaign,
//   type EmailCampaignStatus,
//   type EmailCampaignType,
// } from "@/lib/marketing/email/types";
// import { avatarColor, initials } from "@/lib/activities/shared";
// import { cn } from "@/lib/utils";

// const STATUS_STYLE: Record<EmailCampaignStatus, string> = {
//   Draft: "bg-slate-100 text-slate-600",
//   Scheduled: "bg-sky-50 text-sky-700",
//   Running: "bg-amber-50 text-amber-800",
//   Paused: "bg-violet-50 text-violet-700",
//   Completed: "bg-emerald-50 text-emerald-700",
//   Cancelled: "bg-rose-50 text-rose-700",
// };

// export default function EmailCampaignsPage() {
//   const router = useRouter();
//   const [rows, setRows] = useState<EmailCampaign[]>(seed);
//   const [statusTab, setStatusTab] = useState<EmailCampaignStatus | "All">(
//     "All",
//   );
//   const [typeFilter, setTypeFilter] = useState<EmailCampaignType | "All">(
//     "All",
//   );
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const [filterOpen, setFilterOpen] = useState(false);
//   const [statusOpen, setStatusOpen] = useState(false);
//   const filterRef = useRef<HTMLDivElement>(null);
//   const statusRef = useRef<HTMLDivElement>(null);
//   const pageSize = 8;

//   useEffect(() => {
//     function onClickOutside(e: MouseEvent) {
//       if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
//         setFilterOpen(false);
//       }
//       if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
//         setStatusOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", onClickOutside);
//     return () => document.removeEventListener("mousedown", onClickOutside);
//   }, []);

//   useEffect(() => {
//     setRows(listEmailCampaigns());
//   }, []);

//   useEffect(() => {
//     setPage(1);
//   }, [statusTab, typeFilter, search]);

//   const counts = useMemo(() => {
//     const map = Object.fromEntries(
//       EMAIL_CAMPAIGN_STATUSES.map((s) => [s, 0]),
//     ) as Record<EmailCampaignStatus, number>;
//     for (const r of rows) map[r.status] += 1;
//     return map;
//   }, [rows]);

//   const filtered = useMemo(() => {
//     let data = rows;
//     if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
//     if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       data = data.filter(
//         (r) =>
//           r.name.toLowerCase().includes(q) ||
//           r.campaignId.toLowerCase().includes(q) ||
//           r.subject.toLowerCase().includes(q) ||
//           r.audience.toLowerCase().includes(q) ||
//           r.templateName.toLowerCase().includes(q),
//       );
//     }
//     return data;
//   }, [rows, statusTab, typeFilter, search]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//   const safePage = Math.min(page, totalPages);
//   const paginated = filtered.slice(
//     (safePage - 1) * pageSize,
//     safePage * pageSize,
//   );

//   function exportCsv() {
//     const header = [
//       "ID",
//       "Name",
//       "Type",
//       "Status",
//       "Audience",
//       "Subject",
//       "Sent",
//       "Opens",
//       "Clicks",
//       "Bounces",
//       "Unsubs",
//     ];
//     const body = filtered.map((r) =>
//       [
//         r.campaignId,
//         r.name,
//         r.type,
//         r.status,
//         r.audience,
//         r.subject,
//         r.sentCount,
//         r.openCount,
//         r.clickCount,
//         r.bounceCount,
//         r.unsubscribeCount,
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
//     a.download = "email-campaigns.csv";
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   return (
//     <div className="relative min-h-full overflow-y-auto bg-slate-50">
//       <div className="relative mx-auto flex max-w-[1920px] flex-col p-2 sm:p-4 lg:p-6">
//         <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
//           <div className="flex min-w-0 flex-col gap-1">
//             //             <h1 className="text-2xl font-bold tracking-tight text-slate-900">
//               Marketing
//             </h1>
//           </div>
//           <div className="flex items-center gap-2.5">
//             <button
//               type="button"
//               onClick={exportCsv}
//               className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
//             >
//               <Download className="h-4 w-4" />
//               Export
//             </button>
//             <button
//               type="button"
//               onClick={() =>
//                 router.push(
//                   "/marketing/email/create?layoutid=standard&redirect=false",
//                 )
//               }
//               className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
//             >
//               <Plus className="h-4 w-4" />
//               New campaign
//             </button>
//           </div>
//         </div>

//         <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2">
//           <div ref={statusRef} className="relative">
//             <button
//               type="button"
//               onClick={() => setStatusOpen((o) => !o)}
//               className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 pr-3 pl-4 text-sm font-semibold text-white shadow-sm"
//             >
//               {statusTab}
//               <span className="rounded-full bg-white/20 px-1.5 text-[12px] font-bold tabular-nums">
//                 {statusTab === "All" ? rows.length : counts[statusTab]}
//               </span>
//               <ChevronDown className="h-3.5 w-3.5" />
//             </button>
//             {statusOpen ? (
//               <div className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setStatusTab("All");
//                     setStatusOpen(false);
//                   }}
//                   className={cn(
//                     "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium hover:bg-slate-50",
//                     statusTab === "All" ? "text-violet-700" : "text-slate-600",
//                   )}
//                 >
//                   <span className="flex items-center gap-2">
//                     All
//                     <span className="text-[12px] font-semibold text-slate-400">
//                       {rows.length}
//                     </span>
//                   </span>
//                   {statusTab === "All" ? (
//                     <Check className="h-3.5 w-3.5" />
//                   ) : null}
//                 </button>
//                 <div className="my-1 border-t border-slate-100" />
//                 {EMAIL_CAMPAIGN_STATUSES.map((s) => (
//                   <button
//                     key={s}
//                     type="button"
//                     onClick={() => {
//                       setStatusTab(s);
//                       setStatusOpen(false);
//                     }}
//                     className={cn(
//                       "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium hover:bg-slate-50",
//                       statusTab === s ? "text-violet-700" : "text-slate-600",
//                     )}
//                   >
//                     <span className="flex items-center gap-2">
//                       {s}
//                       <span className="text-[12px] font-semibold text-slate-400">
//                         {counts[s]}
//                       </span>
//                     </span>
//                     {statusTab === s ? <Check className="h-3.5 w-3.5" /> : null}
//                   </button>
//                 ))}
//               </div>
//             ) : null}
//           </div>
//           <div className="flex items-center gap-2.5">
//             <div className="relative">
//               <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
//               <input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search…"
//                 className="h-9 w-60 rounded-xl border border-slate-200/90 bg-white pr-3.5 pl-10 text-sm outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
//               />
//             </div>
//             <div ref={filterRef} className="relative">
//               <button
//                 type="button"
//                 onClick={() => setFilterOpen((o) => !o)}
//                 className={cn(
//                   "inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
//                   typeFilter !== "All"
//                     ? "border-violet-200 bg-violet-50 text-violet-700"
//                     : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
//                 )}
//               >
//                 <Filter className="h-4 w-4" />
//                 Filter
//                 {typeFilter !== "All" ? (
//                   <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
//                     1
//                   </span>
//                 ) : null}
//                 <ChevronDown className="h-3.5 w-3.5" />
//               </button>
//               {filterOpen ? (
//                 <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setTypeFilter("All");
//                       setFilterOpen(false);
//                     }}
//                     className={cn(
//                       "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium hover:bg-slate-50",
//                       typeFilter === "All"
//                         ? "text-violet-700"
//                         : "text-slate-600",
//                     )}
//                   >
//                     All types
//                     {typeFilter === "All" ? (
//                       <Check className="h-3.5 w-3.5" />
//                     ) : null}
//                   </button>
//                   <div className="my-1 border-t border-slate-100" />
//                   {EMAIL_CAMPAIGN_TYPES.map((t) => (
//                     <button
//                       key={t}
//                       type="button"
//                       onClick={() => {
//                         setTypeFilter(t);
//                         setFilterOpen(false);
//                       }}
//                       className={cn(
//                         "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium hover:bg-slate-50",
//                         typeFilter === t ? "text-violet-700" : "text-slate-600",
//                       )}
//                     >
//                       {t}
//                       {typeFilter === t ? (
//                         <Check className="h-3.5 w-3.5" />
//                       ) : null}
//                     </button>
//                   ))}
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>

//         <div className="flex min-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-sm">
//           <div className="flex min-h-0 flex-1 flex-col">
//             <div className="min-h-0 flex-1 overflow-auto">
//               <table className="w-full min-w-[1100px] text-left text-sm">
//                 <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[12px] font-semibold tracking-wide text-slate-400 uppercase">
//                   <tr>
//                     <th className="px-6 py-2">Type</th>
//                     <th className="px-6 py-2">Campaign</th>
//                     <th className="px-6 py-2">Subject</th>
//                     <th className="px-6 py-2">Audience</th>
//                     <th className="px-6 py-2">Status</th>
//                     <th className="px-6 py-2">Sent</th>
//                     <th className="px-6 py-2">Open / Click</th>
//                     <th className="px-6 py-2">Created By</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {paginated.map((r) => (
//                     <tr
//                       key={r.id}
//                       className="cursor-pointer transition-colors hover:bg-violet-50/40"
//                       onClick={() => router.push(`/marketing/email/${r.id}`)}
//                     >
//                       <td className="max-w-[220px] px-6 py-1">
//                         <p className="truncate text-[15px] font-semibold text-slate-900">
//                           {r.name}
//                         </p>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">{r.type}</td>
//                       <td className="max-w-[220px] truncate px-6 py-1 text-slate-600">
//                         {r.subject}
//                       </td>
//                       <td className="max-w-[180px] truncate px-6 py-1 text-slate-500">
//                         {r.audience}
//                       </td>
//                       <td className="px-6 py-1">
//                         <span
//                           className={cn(
//                             "rounded-full px-3 py-1 text-[12px] font-semibold",
//                             STATUS_STYLE[r.status],
//                           )}
//                         >
//                           {r.status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-1 tabular-nums text-slate-600">
//                         {r.sentCount.toLocaleString()}
//                       </td>
//                       <td className="px-6 py-1 tabular-nums text-slate-500">
//                         {openRate(r)}
//                         <span className="text-slate-300"> · </span>
//                         {clickRate(r)}
//                       </td>
//                       <td className="px-6 py-1">
//                         <div className="flex items-center gap-2.5">
//                           <span
//                             className={cn(
//                               "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold",
//                               avatarColor(r.createdBy),
//                             )}
//                           >
//                             {initials(r.createdBy)}
//                           </span>
//                           {r.createdBy}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                   {paginated.length === 0 ? (
//                     <tr>
//                       <td
//                         colSpan={8}
//                         className="px-6 py-24 text-center text-base text-slate-400"
//                       >
//                         <Mail className="mx-auto mb-3 h-10 w-10 text-slate-300" />
//                         No campaigns match. Create one to start nurturing.
//                       </td>
//                     </tr>
//                   ) : null}
//                 </tbody>
//               </table>
//             </div>
//             {filtered.length > 0 ? (
//               <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">
//                 <span>
//                   Showing {(safePage - 1) * pageSize + 1}–
//                   {Math.min(safePage * pageSize, filtered.length)} of{" "}
//                   {filtered.length}
//                 </span>
//                 <div className="flex gap-1.5">
//                   <button
//                     type="button"
//                     disabled={safePage === 1}
//                     onClick={() => setPage((p) => Math.max(1, p - 1))}
//                     className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
//                   >
//                     Prev
//                   </button>
//                   <button
//                     type="button"
//                     disabled={safePage === totalPages}
//                     onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//                     className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
//                   >
//                     Next
//                   </button>
//                 </div>
//               </div>
//             ) : null}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import {
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CAMPAIGN_TYPES,
  clickRate,
  emailCampaigns as seed,
  listEmailCampaigns,
  openRate,
  type EmailCampaign,
  type EmailCampaignStatus,
  type EmailCampaignType,
} from "@/lib/marketing/email/types";
import {
  CampaignHeader,
  MarketingListShell,
  StatusDropdown,
  FilterDropdown,
  DataTable,
  StatusBadge,
  AvatarInitials,
  type DataTableColumn,
} from "@/components/marketing/index";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_STYLE: Record<EmailCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

const columns: DataTableColumn<EmailCampaign>[] = [
  {
    key: "name",
    header: "Type",
    className: "max-w-[220px]",
    render: (r) => (
      <p className="truncate text-[13px] font-semibold text-slate-900">
        {r.name}
      </p>
    ),
  },
  { key: "type", header: "Campaign", render: (r) => r.type },
  {
    key: "subject",
    header: "Subject",
    className: "max-w-[220px] truncate",
    render: (r) => r.subject,
  },
  {
    key: "audience",
    header: "Audience",
    className: "max-w-[180px] truncate",
    render: (r) => r.audience,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusBadge label={r.status} colorClassName={STATUS_STYLE[r.status]} />
    ),
  },
  {
    key: "sentCount",
    header: "Sent",
    className: "tabular-nums text-slate-600",
    render: (r) => r.sentCount.toLocaleString(),
  },
  {
    key: "rates",
    header: "Open / Click",
    className: "tabular-nums text-slate-500",
    render: (r) => (
      <>
        {openRate(r)}
        <span className="text-slate-300"> · </span>
        {clickRate(r)}
      </>
    ),
  },
  {
    key: "createdBy",
    header: "Created By",
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <AvatarInitials name={r.createdBy} />
        {r.createdBy}
      </div>
    ),
  },
];

export default function EmailCampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmailCampaign[]>(seed);
  const [statusTab, setStatusTab] = useState<EmailCampaignStatus | "All">(
    "All",
  );
  const [typeFilter, setTypeFilter] = useState<EmailCampaignType | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listEmailCampaigns());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, typeFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      EMAIL_CAMPAIGN_STATUSES.map((s) => [s, 0]),
    ) as Record<EmailCampaignStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.campaignId.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.audience.toLowerCase().includes(q) ||
          r.templateName.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function exportCsv() {
    const header = [
      "ID",
      "Name",
      "Type",
      "Status",
      "Audience",
      "Subject",
      "Sent",
      "Opens",
      "Clicks",
      "Bounces",
      "Unsubs",
    ];
    const body = filtered.map((r) =>
      [
        r.campaignId,
        r.name,
        r.type,
        r.status,
        r.audience,
        r.subject,
        r.sentCount,
        r.openCount,
        r.clickCount,
        r.bounceCount,
        r.unsubscribeCount,
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
    a.download = "email-campaigns.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MarketingListShell>
      <CampaignHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Marketing" },
          { label: "Email Campaigns" },
        ]}
        title="Email Campaigns"
        totalCount={filtered.length}
        onExport={exportCsv}
        onCreate={() =>
          router.push(
            "/marketing/email/create?layoutid=standard&redirect=false",
          )
        }
        createLabel="New campaign"
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 py-2">
        <StatusDropdown
          statuses={EMAIL_CAMPAIGN_STATUSES}
          counts={counts}
          totalCount={rows.length}
          value={statusTab}
          onChange={setStatusTab}
        />
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <FilterDropdown
            options={EMAIL_CAMPAIGN_TYPES}
            value={typeFilter}
            onChange={setTypeFilter}
            allLabel="All types"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={paginated}
        getRowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/marketing/email/${r.id}`)}
        page={safePage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        emptyState={
          <>
            <Mail className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            No campaigns match. Create one to start nurturing.
          </>
        }
      />
    </MarketingListShell>
  );
}
