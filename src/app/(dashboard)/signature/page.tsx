// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   signatureRequests as seed,
//   listSignatureRequests,
//   type SignatureRequest,
// } from "@/lib/documents/signature/types";
// import { RecentTabsHeader } from "@/components/documents/signature/overview/RecentTabsHeader";
// import SignatureStatsGrid from "@/components/documents/signature/overview/SignatureStatsGrid";
// import {
//   FileText,
//   MoreVertical,
//   CheckCircle2,
//   Clock,
//   CalendarX2,
//   FileCode2,
// } from "lucide-react";
// import { PaginationBar } from "@/components/ui/pagination-bar";
// import { ESignatureHeader } from "@/components/documents/signature/ESignatureHeader";

// // Mock templates data matching the screenshot style
// const mockTemplates = [
//   {
//     id: "tpl-1",
//     name: "Loan Application Form",
//     status: "Draft",
//     description:
//       "Standard loan application form for residential home loan applications.",
//     lastUpdated: "12 Aug 2025",
//     createdBy: { name: "Mohit Chapagain", initials: "MC" },
//   },
//   {
//     id: "tpl-2",
//     name: "Privacy Consent Form",
//     status: "Draft",
//     description: "Consent form to collect and use personal information.",
//     lastUpdated: "11 Aug 2025",
//     createdBy: { name: "Mohit Chapagain", initials: "MC" },
//   },
//   {
//     id: "tpl-3",
//     name: "Broker Authority Form",
//     status: "Draft",
//     description:
//       "Authority form to act on behalf of the client for loan processing.",
//     lastUpdated: "10 Aug 2025",
//     createdBy: { name: "Mohit Chapagain", initials: "MC" },
//   },
//   {
//     id: "tpl-4",
//     name: "ID Verification Form",
//     status: "Draft",
//     description: "Form to verify identity and address documents.",
//     lastUpdated: "10 Aug 2025",
//     createdBy: { name: "Mohit Chapagain", initials: "MC" },
//   },
//   {
//     id: "tpl-5",
//     name: "Financial Disclosure",
//     status: "Draft",
//     description: "Client financial information and disclosure form.",
//     lastUpdated: "9 Aug 2025",
//     createdBy: { name: "Mohit Chapagain", initials: "MC" },
//   },
// ];

// export default function ESignatureOverviewPage() {
//   const router = useRouter();
//   const [requests, setRequests] = useState<SignatureRequest[]>(seed);
//   const [activeTab, setActiveTab] = useState<"documents" | "templates">(
//     "documents",
//   );
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 5;

//   useEffect(() => {
//     setRequests(listSignatureRequests());
//   }, []);

//   const filteredDocuments = useMemo(() => requests, [requests]);

//   const filteredTemplates = useMemo(() => mockTemplates, []);

//   // Pagination slice
//   const paginatedDocuments = useMemo(() => {
//     const start = (currentPage - 1) * pageSize;
//     return filteredDocuments.slice(start, start + pageSize);
//   }, [filteredDocuments, currentPage]);

//   const paginatedTemplates = useMemo(() => {
//     const start = (currentPage - 1) * pageSize;
//     return filteredTemplates.slice(start, start + pageSize);
//   }, [filteredTemplates, currentPage]);

//   const totalItems =
//     activeTab === "documents"
//       ? filteredDocuments.length
//       : filteredTemplates.length;

//   return (
//     <div className="relative mx-auto flex w-full flex-col p-4 space-y-6">
//       <ESignatureHeader />

//       <SignatureStatsGrid />

//       {/* Main Content Table Section */}
//       <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
//         <RecentTabsHeader
//           onTabChange={(tab) => {
//             setActiveTab(tab);
//             setCurrentPage(1);
//           }}
//         />

//         {/* Table View */}
//         <div className="overflow-x-auto">
//           {activeTab === "documents" ? (
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
//                   <th className="py-3 px-4">Document Name</th>
//                   <th className="py-3 px-4">Applicants / Recipients</th>
//                   <th className="py-3 px-4">Owner</th>
//                   <th className="py-3 px-4">Related To</th>
//                   <th className="py-3 px-4">Status</th>
//                   <th className="py-3 px-4">Sent</th>
//                   <th className="py-3 px-4">Last Activity</th>
//                   <th className="py-3 px-4 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
//                 {paginatedDocuments.length > 0 ? (
//                   paginatedDocuments.map((doc) => (
//                     <tr
//                       key={doc.signatureRequestId}
//                       className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
//                     >
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-3">
//                           <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
//                             <FileText className="h-4 w-4" />
//                           </div>
//                           <div>
//                             <div className="font-semibold text-slate-900 dark:text-white">
//                               {doc.documentName}
//                             </div>
//                             <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
//                               Draft
//                             </span>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-1.5">
//                           <div className="flex -space-x-1.5 overflow-hidden">
//                             <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 ring-2 ring-white dark:ring-zinc-950">
//                               JS
//                             </span>
//                             <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 ring-2 ring-white dark:ring-zinc-950">
//                               SL
//                             </span>
//                           </div>
//                           <span className="text-slate-500 truncate max-w-[150px]">
//                             {doc.signer || "john.smith@email.com"}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-2">
//                           <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold dark:bg-zinc-800 dark:text-zinc-300">
//                             F
//                           </div>
//                           <span className="font-medium text-slate-900 dark:text-white">
//                             Finconnex
//                           </span>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
//                         {doc.relatedTo || "Lead: William Anderson"}
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <span
//                           className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
//                             doc.status === "Signed"
//                               ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
//                               : doc.status === "Expired"
//                                 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
//                                 : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
//                           }`}
//                         >
//                           {doc.status === "Signed" && (
//                             <CheckCircle2 className="h-3 w-3" />
//                           )}
//                           {doc.status === "Expired" && (
//                             <CalendarX2 className="h-3 w-3" />
//                           )}
//                           {doc.status !== "Signed" &&
//                             doc.status !== "Expired" && (
//                               <Clock className="h-3 w-3" />
//                             )}
//                           {doc.status}
//                         </span>
//                       </td>
//                       <td className="py-3.5 px-4 text-slate-500">
//                         12 Aug 2025
//                       </td>
//                       <td className="py-3.5 px-4 text-slate-500">
//                         2 hours ago
//                       </td>
//                       <td className="py-3.5 px-4 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => router.push(`/signature/${doc.id}`)}
//                             className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
//                           >
//                             View
//                           </button>
//                           <button className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900">
//                             <MoreVertical className="h-4 w-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={8} className="py-8 text-center text-slate-400">
//                       No documents found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           ) : (
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
//                   <th className="py-3 px-4">Template Name</th>
//                   <th className="py-3 px-4">Description</th>
//                   <th className="py-3 px-4">Last Updated</th>
//                   <th className="py-3 px-4">Created By</th>
//                   <th className="py-3 px-4 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
//                 {paginatedTemplates.length > 0 ? (
//                   paginatedTemplates.map((tpl) => (
//                     <tr
//                       key={tpl.id}
//                       className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
//                     >
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-3">
//                           <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
//                             <FileCode2 className="h-4 w-4" />
//                           </div>
//                           <div>
//                             <div className="font-semibold text-slate-900 dark:text-white">
//                               {tpl.name}
//                             </div>
//                             <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
//                               {tpl.status}
//                             </span>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
//                         {tpl.description}
//                       </td>
//                       <td className="py-3.5 px-4 text-slate-500">
//                         {tpl.lastUpdated}
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-2">
//                           <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
//                             {tpl.createdBy.initials}
//                           </span>
//                           <span className="font-medium text-slate-900 dark:text-white">
//                             {tpl.createdBy.name}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
//                             Use
//                           </button>
//                           <button className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900">
//                             <MoreVertical className="h-4 w-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={5} className="py-8 text-center text-slate-400">
//                       No templates found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           )}
//         </div>

//         {/* Reusable Pagination Bar Component */}
//         <PaginationBar
//           page={currentPage}
//           pageSize={pageSize}
//           total={totalItems}
//           onPageChange={(p) => setCurrentPage(p)}
//           entriesLabel={activeTab === "documents" ? "documents" : "templates"}
//         />
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signatureRequests as seed,
  listSignatureRequests,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import { RecentTabsHeader } from "@/components/documents/signature/overview/RecentTabsHeader";
import SignatureStatsGrid from "@/components/documents/signature/overview/SignatureStatsGrid";
import {
  FileText,
  MoreVertical,
  CheckCircle2,
  Clock,
  CalendarX2,
  FileCode2,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ESignatureHeader } from "@/components/documents/signature/ESignatureHeader";
import { Tooltip } from "@/components/ui/tooltip";
import { useDataTable } from "@/hooks/useDataTable";

// Mock templates data matching the screenshot style
const mockTemplates = [
  {
    id: "tpl-1",
    name: "Loan Application Form",
    status: "Draft",
    description:
      "Standard loan application form for residential home loan applications.",
    lastUpdated: "12 Aug 2025",
    createdBy: { name: "Mohit Chapagain", initials: "MC" },
  },
  {
    id: "tpl-2",
    name: "Privacy Consent Form",
    status: "Draft",
    description: "Consent form to collect and use personal information.",
    lastUpdated: "11 Aug 2025",
    createdBy: { name: "Mohit Chapagain", initials: "MC" },
  },
  {
    id: "tpl-3",
    name: "Broker Authority Form",
    status: "Draft",
    description:
      "Authority form to act on behalf of the client for loan processing.",
    lastUpdated: "10 Aug 2025",
    createdBy: { name: "Mohit Chapagain", initials: "MC" },
  },
  {
    id: "tpl-4",
    name: "ID Verification Form",
    status: "Draft",
    description: "Form to verify identity and address documents.",
    lastUpdated: "10 Aug 2025",
    createdBy: { name: "Mohit Chapagain", initials: "MC" },
  },
  {
    id: "tpl-5",
    name: "Financial Disclosure",
    status: "Draft",
    description: "Client financial information and disclosure form.",
    lastUpdated: "9 Aug 2025",
    createdBy: { name: "Mohit Chapagain", initials: "MC" },
  },
];

type TemplateItem = (typeof mockTemplates)[number];

const DOC_DEFAULT_WIDTHS = {
  name: 240,
  recipients: 200,
  owner: 150,
  relatedTo: 170,
  status: 140,
  sent: 110,
  lastActivity: 130,
  action: 140,
};

const DOC_MIN_WIDTHS = {
  name: 160,
  recipients: 140,
  owner: 100,
  relatedTo: 100,
  status: 110,
  sent: 90,
  lastActivity: 100,
  action: 120,
};

const TPL_DEFAULT_WIDTHS = {
  name: 240,
  description: 300,
  lastUpdated: 130,
  createdBy: 160,
  action: 140,
};

const TPL_MIN_WIDTHS = {
  name: 160,
  description: 180,
  lastUpdated: 100,
  createdBy: 120,
  action: 120,
};

export default function ESignatureOverviewPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"documents" | "templates">(
    "documents",
  );

  const documentsTable = useDataTable<SignatureRequest>({
    data: seed,
    defaultWidths: DOC_DEFAULT_WIDTHS,
    minWidths: DOC_MIN_WIDTHS,
    pageSize: 5,
    searchFilterFn: () => true, // no search on this page — table just lists recent items
  });

  const templatesTable = useDataTable<TemplateItem>({
    data: mockTemplates,
    defaultWidths: TPL_DEFAULT_WIDTHS,
    minWidths: TPL_MIN_WIDTHS,
    pageSize: 5,
    searchFilterFn: () => true,
  });

  useEffect(() => {
    documentsTable.setItems(listSignatureRequests());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDocs = documentsTable;
  const activeTpls = templatesTable;

  const totalItems =
    activeTab === "documents"
      ? activeDocs.filteredTotal
      : activeTpls.filteredTotal;

  if (!documentsTable.isMounted || !templatesTable.isMounted) return null;

  return (
    <div className="relative mx-auto flex w-full flex-col p-4 space-y-6">
      <ESignatureHeader />

      <SignatureStatsGrid />

      {/* Main Content Table Section */}
      <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <RecentTabsHeader
          onTabChange={(tab) => {
            setActiveTab(tab);
            documentsTable.setPage(1);
            templatesTable.setPage(1);
          }}
        />

        {/* Table View */}
        <div
          ref={
            activeTab === "documents"
              ? activeDocs.containerRef
              : activeTpls.containerRef
          }
          className="overflow-x-auto relative"
        >
          {/* Active Resize Indicator Line */}
          {(activeTab === "documents"
            ? activeDocs.resizeLineX
            : activeTpls.resizeLineX) !== null && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-violet-500 z-30 pointer-events-none"
              style={{
                left: `${
                  activeTab === "documents"
                    ? activeDocs.resizeLineX
                    : activeTpls.resizeLineX
                }px`,
              }}
            />
          )}

          {activeTab === "documents" ? (
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: activeDocs.widths.name }} />
                <col style={{ width: activeDocs.widths.recipients }} />
                <col style={{ width: activeDocs.widths.owner }} />
                <col style={{ width: activeDocs.widths.relatedTo }} />
                <col style={{ width: activeDocs.widths.status }} />
                <col style={{ width: activeDocs.widths.sent }} />
                <col style={{ width: activeDocs.widths.lastActivity }} />
                <col style={{ width: activeDocs.widths.action }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
                  {(
                    [
                      ["name", "Document Name"],
                      ["recipients", "Applicants / Recipients"],
                      ["owner", "Owner"],
                      ["relatedTo", "Related To"],
                      ["status", "Status"],
                      ["sent", "Sent"],
                      ["lastActivity", "Last Activity"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="group relative select-none py-3 px-4"
                    >
                      {label}
                      <div
                        onMouseDown={activeDocs.onMouseDown(key)}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeDocs.activeResizeKey === key
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right select-none">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
                {activeDocs.paginatedItems.length > 0 ? (
                  activeDocs.paginatedItems.map((doc) => (
                    <tr
                      key={doc.signatureRequestId}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={doc.documentName} fullWidth>
                              <div className="truncate font-semibold text-slate-900 dark:text-white">
                                {doc.documentName}
                              </div>
                            </Tooltip>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
                              Draft
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 ring-2 ring-white dark:ring-zinc-950">
                              JS
                            </span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 ring-2 ring-white dark:ring-zinc-950">
                              SL
                            </span>
                          </div>
                          <Tooltip
                            content={doc.signer || "john.smith@email.com"}
                            fullWidth
                          >
                            <span className="block truncate text-slate-500">
                              {doc.signer || "john.smith@email.com"}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold dark:bg-zinc-800 dark:text-zinc-300">
                            F
                          </div>
                          <Tooltip content="Finconnex" fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              Finconnex
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tooltip
                          content={doc.relatedTo || "Lead: William Anderson"}
                          fullWidth
                        >
                          <span className="block truncate font-medium text-slate-900 dark:text-white">
                            {doc.relatedTo || "Lead: William Anderson"}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            doc.status === "Signed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : doc.status === "Expired"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                          }`}
                        >
                          {doc.status === "Signed" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {doc.status === "Expired" && (
                            <CalendarX2 className="h-3 w-3" />
                          )}
                          {doc.status !== "Signed" &&
                            doc.status !== "Expired" && (
                              <Clock className="h-3 w-3" />
                            )}
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content="12 Aug 2025" fullWidth>
                          <span className="block truncate">12 Aug 2025</span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content="2 hours ago" fullWidth>
                          <span className="block truncate">2 hours ago</span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/signature/${doc.id}`)}
                            className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            View
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: activeTpls.widths.name }} />
                <col style={{ width: activeTpls.widths.description }} />
                <col style={{ width: activeTpls.widths.lastUpdated }} />
                <col style={{ width: activeTpls.widths.createdBy }} />
                <col style={{ width: activeTpls.widths.action }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:border-zinc-800">
                  {(
                    [
                      ["name", "Template Name"],
                      ["description", "Description"],
                      ["lastUpdated", "Last Updated"],
                      ["createdBy", "Created By"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="group relative select-none py-3 px-4"
                    >
                      {label}
                      <div
                        onMouseDown={activeTpls.onMouseDown(key)}
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-violet-400/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100 hover:bg-violet-500/70 active:bg-violet-500/80 dark:bg-violet-500/50 dark:hover:bg-violet-400/60 ${
                          activeTpls.activeResizeKey === key
                            ? "opacity-100 bg-violet-500/80"
                            : ""
                        }`}
                      />
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right select-none">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs text-slate-700 dark:text-zinc-300">
                {activeTpls.paginatedItems.length > 0 ? (
                  activeTpls.paginatedItems.map((tpl) => (
                    <tr
                      key={tpl.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                            <FileCode2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={tpl.name} fullWidth>
                              <div className="truncate font-semibold text-slate-900 dark:text-white">
                                {tpl.name}
                              </div>
                            </Tooltip>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded dark:bg-zinc-800 dark:text-zinc-400">
                              {tpl.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content={tpl.description} fullWidth>
                          <span className="block truncate">
                            {tpl.description}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <Tooltip content={tpl.lastUpdated} fullWidth>
                          <span className="block truncate">
                            {tpl.lastUpdated}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {tpl.createdBy.initials}
                          </span>
                          <Tooltip content={tpl.createdBy.name} fullWidth>
                            <span className="block truncate font-medium text-slate-900 dark:text-white">
                              {tpl.createdBy.name}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="h-7 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
                            Use
                          </button>
                          <button className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No templates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Reusable Pagination Bar Component */}
        <PaginationBar
          page={activeTab === "documents" ? activeDocs.page : activeTpls.page}
          pageSize={5}
          total={totalItems}
          onPageChange={(p) =>
            activeTab === "documents"
              ? activeDocs.setPage(p)
              : activeTpls.setPage(p)
          }
          entriesLabel={activeTab === "documents" ? "documents" : "templates"}
        />
      </div>
    </div>
  );
}
