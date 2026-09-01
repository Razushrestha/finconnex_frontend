// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Link2, ExternalLink } from "lucide-react";
// import {
//   LINKTREE_STATUSES,
//   linktreePages as seed,
//   listLinktreePages,
//   type LinktreePage,
//   type LinktreeStatus,
// } from "@/lib/marketing/linktree/types";
// import {
//   CampaignHeader,
//   MarketingListShell,
//   StatusDropdown,
//   DataTable,
//   StatusBadge,
//   type DataTableColumn,
// } from "@/components/marketing/index";
// import { SearchInput } from "@/components/ui/search-input";

// const STATUS_STYLE: Record<LinktreeStatus, string> = {
//   Draft: "bg-slate-100 text-slate-600",
//   Live: "bg-emerald-50 text-emerald-700",
//   Paused: "bg-amber-50 text-amber-800",
// };

// const columns: DataTableColumn<LinktreePage>[] = [
//   {
//     key: "title",
//     header: "Page",
//     className: "max-w-[220px]",
//     render: (p) => (
//       <>
//         <p className="truncate text-[13px] font-semibold text-slate-900">
//           {p.displayName || p.title}
//         </p>
//       </>
//     ),
//   },
//   {
//     key: "slug",
//     header: "Public URL",
//     render: (p) => (
//       <Link
//         href={`/l/${p.slug}`}
//         target="_blank"
//         onClick={(e) => e.stopPropagation()}
//         className="inline-flex items-center gap-1 font-mono text-[13px] text-violet-700 hover:underline"
//       >
//         /l/{p.slug}
//         <ExternalLink className="h-3.5 w-3.5" />
//       </Link>
//     ),
//   },
//   {
//     key: "status",
//     header: "Status",
//     render: (p) => (
//       <StatusBadge label={p.status} colorClassName={STATUS_STYLE[p.status]} />
//     ),
//   },
//   {
//     key: "links",
//     header: "Links",
//     className: "tabular-nums",
//     render: (p) => p.links,
//   },
//   {
//     key: "views",
//     header: "Views",
//     className: "tabular-nums",
//     render: (p) => p.views.toLocaleString(),
//   },
//   {
//     key: "owner",
//     header: "Owner",
//     className: "text-slate-600",
//     render: (p) => p.owner,
//   },
// ];

// export default function LinktreeListPage() {
//   const router = useRouter();
//   const [rows, setRows] = useState<LinktreePage[]>(seed);
//   const [statusTab, setStatusTab] = useState<LinktreeStatus | "All">("All");
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(1);
//   const pageSize = 8;

//   useEffect(() => {
//     setRows(listLinktreePages());
//   }, []);

//   useEffect(() => {
//     setPage(1);
//   }, [statusTab, search]);

//   const counts = useMemo(() => {
//     const map = Object.fromEntries(
//       LINKTREE_STATUSES.map((s) => [s, 0]),
//     ) as Record<LinktreeStatus, number>;
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
//           (r.displayName ?? "").toLowerCase().includes(q) ||
//           r.pageId.toLowerCase().includes(q) ||
//           r.slug.toLowerCase().includes(q) ||
//           r.owner.toLowerCase().includes(q),
//       );
//     }
//     return data;
//   }, [rows, statusTab, search]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//   const safePage = Math.min(page, totalPages);
//   const paginated = filtered.slice(
//     (safePage - 1) * pageSize,
//     safePage * pageSize,
//   );

//   return (
//     <MarketingListShell>
//       <CampaignHeader
//         breadcrumbs={[
//           { label: "Home", href: "/" },
//           { label: "Marketing" },
//           { label: "Broker pages" },
//         ]}
//         title="Broker pages"
//         totalCount={filtered.length}
//         onCreate={() =>
//           router.push(
//             "/marketing/linktree/create?layoutid=standard&redirect=false",
//           )
//         }
//         createLabel="New page"
//       />

//       <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 py-2">
//         <StatusDropdown
//           statuses={LINKTREE_STATUSES}
//           counts={counts}
//           totalCount={rows.length}
//           value={statusTab}
//           onChange={setStatusTab}
//         />
//         <SearchInput value={search} onChange={setSearch} />
//       </div>

//       <DataTable
//         columns={columns}
//         rows={paginated}
//         getRowKey={(p) => p.id}
//         onRowClick={(p) => router.push(`/marketing/linktree/${p.id}`)}
//         page={safePage}
//         pageSize={pageSize}
//         totalCount={filtered.length}
//         onPageChange={setPage}
//         emptyState={
//           <>
//             <Link2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
//             No link pages match.
//           </>
//         }
//       />
//     </MarketingListShell>
//   );
// }

"use client";

import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";

// TODO(api): replace with a real fetch for the logged-in broker's hub,
// e.g. GET /brokers/me/hub
function getInitialHubConfig(): BrokerHubConfig {
  return {
    brokerId: "me",
    hubName: "Alex's Hub",
    profile: {
      slug: "alex-rivera",
      avatarUrl: null,
      title: "Alex Rivera | Wealth Advisor",
      bio: "Helping tech professionals navigate wealth building and equity compensation.",
    },
    // Starts empty — links only appear here (and in the preview) once the
    // broker adds them via the "Add link" button in the editor.
    links: [],
    // Starts empty — socials only appear here (and in the preview) once the
    // broker adds them.
    socials: [],
    published: false,
  };
}

export default function LinktreePage() {
  const handleSave = async (config: BrokerHubConfig) => {
    // TODO(api): PATCH /brokers/me/hub
    console.log("Saving hub config", config);
  };

  return (
    <BrokerHubBuilder
      initialConfig={getInitialHubConfig()}
      onSave={handleSave}
    />
  );
}
