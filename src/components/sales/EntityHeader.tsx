// "use client";

// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//   Package,
//   RotateCw,
//   Home,
//   Filter,
//   Search,
//   List,
//   LayoutGrid,
//   Plus,
//   ChevronDown,
// } from "lucide-react";

// const DEFAULT_LAYOUT_ID = "standard";

// export interface PipelineOption {
//   label: string;
//   value: string;
// }

// export interface EntityHeaderProps {
//   entityLabel: string;
//   entityLabelPlural?: string;
//   createRoute: string;
//   breadcrumb?: string[];
//   totalCount?: number;

//   pipelineOptions?: PipelineOption[];
//   activePipeline?: string;
//   onPipelineChange?: (pipeline: string) => void;

//   onToggleFilter?: () => void;
//   isFilterOpen?: boolean;

//   searchValue?: string;
//   onSearchChange?: (value: string) => void;
//   searchPlaceholder?: string;

//   viewMode?: "kanban" | "list";
//   onViewChange?: (mode: "kanban" | "list") => void;

//   onExport?: () => void;
//   onRefresh?: () => void;
// }

// export function EntityHeader({
//   entityLabel,
//   entityLabelPlural = `${entityLabel}s`,
//   createRoute,
//   breadcrumb = ["Sales", entityLabelPlural],
//   totalCount,
//   pipelineOptions,
//   activePipeline,
//   onPipelineChange,
//   onToggleFilter,
//   isFilterOpen,
//   searchValue,
//   onSearchChange,
//   searchPlaceholder = `Search ${entityLabelPlural}`,
//   viewMode = "kanban",
//   onViewChange,
//   onExport,
//   onRefresh,
// }: EntityHeaderProps) {
//   const router = useRouter();
//   const title = pipelineOptions
//     ? `${activePipeline} Pipeline`
//     : entityLabelPlural;

//   return (
//     <div className="w-full bg-slate-50/50">
//       <nav className="flex items-center gap-2 text-sm text-slate-400">
//         <Link
//           href="/"
//           className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"
//         >
//           <Home className="h-4 w-4" />
//           <span>Home</span>
//         </Link>
//         {breadcrumb.map((crumb, i) => (
//           <span key={crumb} className="flex items-center gap-2">
//             <span>&gt;</span>
//             <span
//               className={
//                 i === breadcrumb.length - 1
//                   ? "text-slate-600 font-medium"
//                   : "hover:text-slate-600 transition-colors"
//               }
//             >
//               {crumb}
//             </span>
//           </span>
//         ))}
//       </nav>

//       <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
//         <div className="flex items-center gap-3">
//           <h1 className="text-xl font-bold tracking-tight text-slate-900">
//             {title}
//           </h1>
//           {totalCount !== undefined && (
//             <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
//               {totalCount}
//             </span>
//           )}
//         </div>

//         {/* Pipeline Selector and Actions */}
//         <div className="flex items-center gap-3">
//           {pipelineOptions && (
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-medium text-slate-500">
//                 Pipelines
//               </span>
//               <select
//                 value={activePipeline}
//                 onChange={(e) => onPipelineChange?.(e.target.value)}
//                 className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-2xs focus:border-indigo-300 focus:outline-none"
//               >
//                 {pipelineOptions.map((opt) => (
//                   <option key={opt.value} value={opt.value}>
//                     {opt.label}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               onClick={onExport}
//               className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
//             >
//               <Package className="h-4 w-4 text-slate-500" />
//               <span>Export</span>
//             </button>
//             <button
//               type="button"
//               onClick={onRefresh}
//               aria-label="Refresh"
//               className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
//             >
//               <RotateCw className="h-4 w-4" />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Toolbar with Filters, Search, and View Toggles */}
//       <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
//         <div className="flex flex-wrap items-center gap-3">
//           <button
//             type="button"
//             onClick={onToggleFilter}
//             aria-pressed={isFilterOpen}
//             className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-2xs transition-colors ${
//               isFilterOpen
//                 ? "border-indigo-300 bg-indigo-50/50 text-indigo-700"
//                 : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
//             }`}
//           >
//             <Filter className="h-4 w-4 text-slate-500" />
//             <span>Filter</span>
//             <ChevronDown className="h-4 w-4 text-slate-400" />
//           </button>

//           <div className="relative">
//             <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//             <input
//               type="text"
//               value={searchValue}
//               onChange={(e) => onSearchChange?.(e.target.value)}
//               placeholder={searchPlaceholder}
//               className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
//             />
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
//             <button
//               type="button"
//               aria-label="List view"
//               onClick={() => onViewChange?.("list")}
//               className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
//                 viewMode === "list"
//                   ? "bg-emerald-600 text-white shadow-2xs"
//                   : "text-slate-400 hover:text-slate-700"
//               }`}
//             >
//               <List className="h-4 w-4" />
//             </button>
//             <button
//               type="button"
//               aria-label="Grid view"
//               onClick={() => onViewChange?.("kanban")}
//               className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
//                 viewMode === "kanban"
//                   ? "bg-emerald-600 text-white shadow-2xs"
//                   : "text-slate-400 hover:text-slate-700"
//               }`}
//             >
//               <LayoutGrid className="h-4 w-4" />
//             </button>
//           </div>

//           <button
//             type="button"
//             onClick={() =>
//               router.push(
//                 `${createRoute}?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
//               )
//             }
//             className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
//           >
//             <Plus className="h-4 w-4" />
//             <span>Create {entityLabel}</span>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  RotateCw,
  Home,
  Filter,
  Search,
  List,
  LayoutGrid,
  Plus,
  ChevronDown,
} from "lucide-react";

const DEFAULT_LAYOUT_ID = "standard";

export interface PipelineOption {
  label: string;
  value: string;
}

export interface EntityHeaderProps {
  /** Singular entity name — drives the Create button label ("Create Lead" / "Create Contact" / "Create Deal"). */
  entityLabel: string;
  /** Plural form for the page title and search placeholder, e.g. "Leads", "Contacts", "Deals". Defaults to `${entityLabel}s`. */
  entityLabelPlural?: string;
  /** Route the Create button pushes to, e.g. "/sales/leads/create". Matches the ActivityToolbar convention (?layoutid=...&redirect=false). */
  createRoute: string;
  /** Breadcrumb trail after Home, e.g. ["Dashboard", "Leads"]. Defaults to ["Dashboard", entityLabelPlural]. */
  breadcrumb?: string[];
  /** Total record count shown as a badge next to the title. Omit to hide the badge. */
  totalCount?: number;

  /** Optional pipeline/stage selector (e.g. Leads' Deals/Refinance/Commercial/Insurance). Omit entirely for entities without a pipeline concept. */
  pipelineOptions?: PipelineOption[];
  activePipeline?: string;
  onPipelineChange?: (pipeline: string) => void;

  onToggleFilter?: () => void;
  isFilterOpen?: boolean;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  viewMode?: "kanban" | "list";
  onViewChange?: (mode: "kanban" | "list") => void;

  onExport?: () => void;
  onRefresh?: () => void;
}

export function EntityHeader({
  entityLabel,
  entityLabelPlural = `${entityLabel}s`,
  createRoute,
  breadcrumb = ["Sales", entityLabelPlural],
  totalCount,
  pipelineOptions,
  activePipeline,
  onPipelineChange,
  onToggleFilter,
  isFilterOpen,
  searchValue,
  onSearchChange,
  searchPlaceholder = `Search ${entityLabelPlural}`,
  viewMode = "kanban",
  onViewChange,
  onExport,
  onRefresh,
}: EntityHeaderProps) {
  const router = useRouter();
  const title = pipelineOptions
    ? `${activePipeline} Pipeline`
    : entityLabelPlural;

  return (
    <div className="w-full bg-slate-50/50">
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link
          href="/"
          className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-2">
            <span>&gt;</span>
            <span
              className={
                i === breadcrumb.length - 1
                  ? "text-slate-600 font-medium"
                  : "hover:text-slate-600 transition-colors"
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {totalCount !== undefined && (
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {totalCount}
            </span>
          )}
        </div>

        {/* Pipeline Selector and Actions */}
        <div className="flex items-center gap-3">
          {pipelineOptions && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Pipelines
              </span>
              <select
                value={activePipeline}
                onChange={(e) => onPipelineChange?.(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-2xs focus:border-indigo-300 focus:outline-none"
              >
                {pipelineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Package className="h-4 w-4 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar with Filters, Search, and View Toggles */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleFilter}
            aria-pressed={isFilterOpen}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-2xs transition-colors ${
              isFilterOpen
                ? "border-indigo-300 bg-indigo-50/50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4 text-slate-500" />
            <span>Filter</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              aria-label="List view"
              onClick={() => onViewChange?.("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => onViewChange?.("kanban")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "kanban"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `${createRoute}?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
              )
            }
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create {entityLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
