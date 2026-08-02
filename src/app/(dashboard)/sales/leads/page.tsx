// "use client";

// import { useEffect, useState } from "react";
// import { EntityHeader } from "@/components/sales/EntityHeader";
// import { LeadKanbanBoard } from "@/components/sales/leads/LeadKanbanBoard";
// import { LeadListView } from "@/components/sales/leads/LeadListView";
// import {
//   FilterLeadsPanel,
//   EMPTY_LEAD_FILTERS,
//   type LeadFilters,
// } from "@/components/sales/leads/FilterLeadsPanel";
// import { listLeadColumns } from "@/lib/leads/store";
// import { LEAD_PIPELINE_STAGES } from "@/lib/leads/types";
// import { stageColumnId } from "@/lib/pipeline-sla/board";
// import { onRulesChange } from "@/lib/rules";
// import { viewEnter } from "@/lib/motion";
// import { cn } from "@/lib/utils";
// import { Sparkles } from "lucide-react";

// const DEFAULT_LEAD_COLUMNS = LEAD_PIPELINE_STAGES.map((stage) => ({
//   id: stageColumnId(stage),
//   label: stage,
//   visible: true,
// }));

// export default function LeadsPage() {
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
//   const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
//   const [totalLeads, setTotalLeads] = useState(0);
//   const [columns, setColumns] = useState(DEFAULT_LEAD_COLUMNS);

//   useEffect(() => {
//     function refresh() {
//       setTotalLeads(
//         listLeadColumns().reduce((sum, column) => sum + column.cards.length, 0),
//       );
//     }
//     refresh();
//     return onRulesChange(() => refresh());
//   }, [viewMode]);

//   function toggleFilterField(section: "source" | "status", field: string) {
//     setFilters((prev) => {
//       const key = section === "source" ? "sources" : "statuses";
//       const current = prev[key];
//       const next = current.includes(field)
//         ? current.filter((f) => f !== field)
//         : [...current, field];
//       return { ...prev, [key]: next };
//     });
//   }

//   function reorderColumn(draggedId: string, targetId: string) {
//     setColumns((prev) => {
//       const next = [...prev];
//       const fromIndex = next.findIndex((c) => c.id === draggedId);
//       const toIndex = next.findIndex((c) => c.id === targetId);
//       if (fromIndex === -1 || toIndex === -1) return prev;
//       const [moved] = next.splice(fromIndex, 1);
//       next.splice(toIndex, 0, moved);
//       return next;
//     });
//   }

//   const visibleColumnIds = columns.filter((c) => c.visible).map((c) => c.id);

//   return (
//     <div className="min-h-screen bg-slate-50 p-2 pr-4">
//       {/* <FocusHighlight /> */}
//       <EntityHeader
//         entityLabel="Lead"
//         columnOptions={columns}
//         onColumnToggle={(id) =>
//           setColumns((prev) =>
//             prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
//           )
//         }
//         onColumnReorder={reorderColumn}
//         createRoute="/sales/leads/create"
//         importOptions={[
//           {
//             id: "import-leads",
//             label: "Import Leads",
//             badge: "New",
//             onClick: () => console.log("button clicked"),
//           },
//           {
//             id: "import-notes",
//             label: "Import Notes",
//             onClick: () => console.log("button clicked"),
//           },
//           {
//             id: "facebook-ads-sync",
//             label: "Facebook Ads Sync",
//             onClick: () => console.log("button clicked"),
//           },
//           {
//             id: "linkedin-ads-sync",
//             label: "LinkedIn Ads Sync",
//             onClick: () => console.log("button clicked"),
//           },
//           {
//             id: "tiktok-ads-sync",
//             label: "Tiktok Ads Sync",
//             onClick: () => console.log("button clicked"),
//           },
//         ]}
//         totalCount={totalLeads}
//         viewMode={viewMode}
//         onViewChange={setViewMode}
//         isFilterOpen={isFilterOpen}
//         onToggleFilter={() => setIsFilterOpen((v) => !v)}
//       />

//       <div className="mt-3 flex items-start gap-4">
//         {isFilterOpen && (
//           <div className="sticky top-6">
//             <FilterLeadsPanel
//               filters={filters}
//               onToggleField={toggleFilterField}
//               onClose={() => setIsFilterOpen(false)}
//             />
//           </div>
//         )}

//         <div key={viewMode} className={cn("flex-1 overflow-x-auto", viewEnter)}>
//           {viewMode === "kanban" ? (
//             <LeadKanbanBoard
//               filters={filters}
//               visibleColumnIds={visibleColumnIds}
//             />
//           ) : (
//             <LeadListView filters={filters} />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import {
  EntityHeader,
  type ActionOption,
} from "@/components/sales/EntityHeader";
import { LeadKanbanBoard } from "@/components/sales/leads/LeadKanbanBoard";
import { LeadListView } from "@/components/sales/leads/LeadListView";
import {
  FilterLeadsPanel,
  EMPTY_LEAD_FILTERS,
  type LeadFilters,
} from "@/components/sales/leads/FilterLeadsPanel";
import { listLeadColumns } from "@/lib/leads/store";
import { LEAD_PIPELINE_STAGES } from "@/lib/leads/types";
import { stageColumnId } from "@/lib/pipeline-sla/board";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  Tag,
  ShieldCheck,
  Download,
} from "lucide-react";

const DEFAULT_LEAD_COLUMNS = LEAD_PIPELINE_STAGES.map((stage) => ({
  id: stageColumnId(stage),
  label: stage,
  visible: true,
}));

export default function LeadsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [totalLeads, setTotalLeads] = useState(0);
  const [columns] = useState(DEFAULT_LEAD_COLUMNS);

  // TODO: wire these up to the actual modals/handlers once they exist.
  const [isMassTransferOpen, setMassTransferOpen] = useState(false);
  const [isMassDeleteOpen, setMassDeleteOpen] = useState(false);
  const [isMassUpdateOpen, setMassUpdateOpen] = useState(false);
  const [isManageTagsOpen, setManageTagsOpen] = useState(false);
  const [isAssignmentRulesOpen, setAssignmentRulesOpen] = useState(false);

  function exportTasks() {
    console.log("export tasks clicked");
  }

  function openPrintView() {
    console.log("print view clicked");
  }

  useEffect(() => {
    function refresh() {
      setTotalLeads(
        listLeadColumns().reduce((sum, column) => sum + column.cards.length, 0),
      );
    }
    refresh();
    return onRulesChange(() => refresh());
  }, [viewMode]);

  function toggleFilterField(section: "source" | "status", field: string) {
    setFilters((prev) => {
      const key = section === "source" ? "sources" : "statuses";
      const current = prev[key];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, [key]: next };
    });
  }

  const visibleColumnIds = columns.filter((c) => c.visible).map((c) => c.id);

  const actionOptions: ActionOption[] = [
    {
      id: "mass-transfer",
      label: "Mass Transfer",
      icon: <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setMassTransferOpen(true),
    },
    {
      id: "mass-delete",
      label: "Mass Delete",
      icon: <Trash2 className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setMassDeleteOpen(true),
    },
    {
      id: "mass-update",
      label: "Mass Update",
      icon: <RefreshCw className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setMassUpdateOpen(true),
    },
    {
      id: "manage-tags",
      label: "Manage Tags",
      icon: <Tag className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setManageTagsOpen(true),
    },
    {
      id: "assignment-rules",
      label: "Assignment Rules",
      icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setAssignmentRulesOpen(true),
    },
    {
      id: "export-tasks",
      label: "Export Tasks",
      icon: <Download className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => exportTasks(),
    },
  ];

  const footerOptions: ActionOption[] = [
    {
      id: "print-view",
      label: "Print View",
      icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" />,
      onClick: () => openPrintView(),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      {/* <FocusHighlight /> */}
      <EntityHeader
        entityLabel="Lead"
        createRoute="/sales/leads/create"
        importOptions={[
          {
            id: "import-leads",
            label: "Import Leads",
            badge: "New",
            onClick: () => console.log("button clicked"),
          },
          {
            id: "import-notes",
            label: "Import Notes",
            onClick: () => console.log("button clicked"),
          },
          {
            id: "facebook-ads-sync",
            label: "Facebook Ads Sync",
            onClick: () => console.log("button clicked"),
          },
          {
            id: "linkedin-ads-sync",
            label: "LinkedIn Ads Sync",
            onClick: () => console.log("button clicked"),
          },
          {
            id: "tiktok-ads-sync",
            label: "Tiktok Ads Sync",
            onClick: () => console.log("button clicked"),
          },
        ]}
        actionOptions={actionOptions}
        footerOptions={footerOptions}
        totalCount={totalLeads}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
      />

      <div className="mt-3 flex items-start gap-4">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterLeadsPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div key={viewMode} className={cn("flex-1 overflow-x-auto", viewEnter)}>
          {viewMode === "kanban" ? (
            <LeadKanbanBoard
              filters={filters}
              visibleColumnIds={visibleColumnIds}
            />
          ) : (
            <LeadListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
