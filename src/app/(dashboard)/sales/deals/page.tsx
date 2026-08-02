// "use client";

// import { useMemo, useState } from "react";
// import {
//   EntityHeader,
//   type PipelineOption,
// } from "@/components/sales/EntityHeader";
// import { DealsKanbanBoard } from "@/components/sales/deals/DealsKanbanBoard";
// import { DealsListView } from "@/components/sales/deals/DealsListView";
// import {
//   DEAL_PIPELINES,
//   DEAL_PIPELINE_STAGES,
//   type DealPipeline,
//   type DealStage,
// } from "@/lib/deals/types";
// import {
//   FilterDealsPanel,
//   EMPTY_DEAL_FILTERS,
//   type DealFilters,
// } from "@/components/sales/deals/FilterDealsPanel";
// import { viewEnter } from "@/lib/motion";
// import { FocusHighlight } from "@/components/shared/FocusHighlight";
// import { cn } from "@/lib/utils";
// import { Sparkles } from "lucide-react";

// const PIPELINE_OPTIONS: PipelineOption[] = DEAL_PIPELINES.map((pipeline) => ({
//   label: pipeline,
//   value: pipeline,
// }));

// export default function DealsPage() {
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
//   const [filters, setFilters] = useState<DealFilters>(EMPTY_DEAL_FILTERS);
//   const [activePipeline, setActivePipeline] = useState<DealPipeline>(
//     DEAL_PIPELINES[0],
//   );

//   const [allStages, setAllStages] =
//     useState<Record<DealPipeline, DealStage[]>>(DEAL_PIPELINE_STAGES);

//   const currentPipelineStages = (allStages && allStages[activePipeline]) || [];

//   // Transform current pipeline stages into column options format required by EntityHeader
//   const columnOptions = useMemo(() => {
//     return currentPipelineStages.map((stage) => ({
//       id: stage.id,
//       label: stage.title,
//       visible: stage.visible ?? true,
//     }));
//   }, [currentPipelineStages]);

//   const visibleColumnIds = useMemo(() => {
//     return columnOptions.filter((c) => c.visible).map((c) => c.id);
//   }, [columnOptions]);

//   const stageOptions = useMemo(() => {
//     return currentPipelineStages
//       .filter((stage) => stage.visible ?? true)
//       .map((stage) => stage.title);
//   }, [currentPipelineStages]);

//   const totalCount = useMemo(() => {
//     return currentPipelineStages
//       .filter((stage) => stage.visible ?? true)
//       .reduce((acc, stage) => acc + (stage?.deals?.length || 0), 0);
//   }, [currentPipelineStages]);

//   function handleToggleField(field: string) {
//     setFilters((prev) => {
//       const current = prev.stages || [];
//       const next = current.includes(field)
//         ? current.filter((f) => f !== field)
//         : [...current, field];
//       return { ...prev, stages: next };
//     });
//   }

//   function handleColumnToggle(id: string) {
//     setAllStages((prev) => {
//       const pipelineStages = prev[activePipeline] || [];
//       const updated = pipelineStages.map((stage) =>
//         stage.id === id
//           ? { ...stage, visible: !(stage.visible ?? true) }
//           : stage,
//       );
//       return { ...prev, [activePipeline]: updated };
//     });
//   }

//   function reorderColumn(draggedId: string, targetId: string) {
//     setAllStages((prev) => {
//       const pipelineStages = [...(prev[activePipeline] || [])];
//       const fromIndex = pipelineStages.findIndex((s) => s.id === draggedId);
//       const toIndex = pipelineStages.findIndex((s) => s.id === targetId);
//       if (fromIndex === -1 || toIndex === -1) return prev;
//       const [moved] = pipelineStages.splice(fromIndex, 1);
//       pipelineStages.splice(toIndex, 0, moved);
//       return { ...prev, [activePipeline]: pipelineStages };
//     });
//   }

//   return (
//     <div className="min-h-screen bg-slate-50 p-2 pr-4 dark:bg-zinc-950">
//       <FocusHighlight />
//       <EntityHeader
//         entityLabel="Deal"
//         createRoute="/sales/deals/create"
//         importOptions={[
//           {
//             id: "import-deals",
//             label: "Import Deals",
//             badge: "New",
//             onClick: () => console.log("button clicked"),
//           },
//           {
//             id: "import-notes",
//             label: "Import Notes",
//             onClick: () => console.log("button clicked"),
//           },
//         ]}
//         totalCount={totalCount}
//         viewMode={viewMode}
//         onViewChange={setViewMode}
//         isFilterOpen={isFilterOpen}
//         onToggleFilter={() => setIsFilterOpen((v) => !v)}
//         pipelineOptions={PIPELINE_OPTIONS}
//         activePipeline={activePipeline}
//         onPipelineChange={(pipeline) => {
//           setActivePipeline(pipeline as DealPipeline);
//           setFilters(EMPTY_DEAL_FILTERS);
//         }}
//         columnOptions={columnOptions}
//         onColumnToggle={handleColumnToggle}
//         onColumnReorder={reorderColumn}
//       />

//       <div className="mt-3 flex items-start gap-4">
//         {isFilterOpen && (
//           <div className="sticky top-6">
//             <FilterDealsPanel
//               stageOptions={stageOptions}
//               filters={filters}
//               onToggleField={handleToggleField}
//               onClose={() => setIsFilterOpen(false)}
//             />
//           </div>
//         )}

//         <div
//           key={`${viewMode}-${activePipeline}`}
//           className={cn("flex-1 overflow-x-auto", viewEnter)}
//         >
//           {viewMode === "kanban" ? (
//             <DealsKanbanBoard
//               pipeline={activePipeline}
//               filters={filters}
//               visibleColumnIds={visibleColumnIds}
//             />
//           ) : (
//             <DealsListView pipeline={activePipeline} filters={filters} />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  Tag,
  ShieldCheck,
  Download,
} from "lucide-react";
import {
  EntityHeader,
  type PipelineOption,
  type ImportOption,
  type ActionOption,
} from "@/components/sales/EntityHeader";
import { DealsKanbanBoard } from "@/components/sales/deals/DealsKanbanBoard";
import { DealsListView } from "@/components/sales/deals/DealsListView";
import {
  DEAL_PIPELINES,
  DEAL_PIPELINE_STAGES,
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import {
  FilterDealsPanel,
  EMPTY_DEAL_FILTERS,
  type DealFilters,
} from "@/components/sales/deals/FilterDealsPanel";
import { viewEnter } from "@/lib/motion";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";

const PIPELINE_OPTIONS: PipelineOption[] = DEAL_PIPELINES.map((pipeline) => ({
  label: pipeline,
  value: pipeline,
}));

export default function DealsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<DealFilters>(EMPTY_DEAL_FILTERS);
  const [activePipeline, setActivePipeline] = useState<DealPipeline>(
    DEAL_PIPELINES[0],
  );

  const [allStages, setAllStages] =
    useState<Record<DealPipeline, DealStage[]>>(DEAL_PIPELINE_STAGES);

  const [isImportDealsOpen, setIsImportDealsOpen] = useState(false);
  const [isImportNotesOpen, setIsImportNotesOpen] = useState(false);

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

  const currentPipelineStages = (allStages && allStages[activePipeline]) || [];

  // Transform current pipeline stages into column options format required by EntityHeader
  const columnOptions = useMemo(() => {
    return currentPipelineStages.map((stage) => ({
      id: stage.id,
      label: stage.title,
      visible: stage.visible ?? true,
    }));
  }, [currentPipelineStages]);

  const visibleColumnIds = useMemo(() => {
    return columnOptions.filter((c) => c.visible).map((c) => c.id);
  }, [columnOptions]);

  const stageOptions = useMemo(() => {
    return currentPipelineStages
      .filter((stage) => stage.visible ?? true)
      .map((stage) => stage.title);
  }, [currentPipelineStages]);

  const totalCount = useMemo(() => {
    return currentPipelineStages
      .filter((stage) => stage.visible ?? true)
      .reduce((acc, stage) => acc + (stage?.deals?.length || 0), 0);
  }, [currentPipelineStages]);

  const importOptions: ImportOption[] = [
    {
      id: "import-deals",
      label: "Import Deals",
      icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" />,
      onClick: () => setIsImportDealsOpen(true),
    },
    {
      id: "import-notes",
      label: "Import Notes",
      onClick: () => setIsImportNotesOpen(true),
    },
  ];

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

  function handleToggleField(field: string) {
    setFilters((prev) => {
      const current = prev.stages || [];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, stages: next };
    });
  }

  function handleColumnToggle(id: string) {
    setAllStages((prev) => {
      const pipelineStages = prev[activePipeline] || [];
      const updated = pipelineStages.map((stage) =>
        stage.id === id
          ? { ...stage, visible: !(stage.visible ?? true) }
          : stage,
      );
      return { ...prev, [activePipeline]: updated };
    });
  }

  function reorderColumn(draggedId: string, targetId: string) {
    setAllStages((prev) => {
      const pipelineStages = [...(prev[activePipeline] || [])];
      const fromIndex = pipelineStages.findIndex((s) => s.id === draggedId);
      const toIndex = pipelineStages.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = pipelineStages.splice(fromIndex, 1);
      pipelineStages.splice(toIndex, 0, moved);
      return { ...prev, [activePipeline]: pipelineStages };
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4 dark:bg-zinc-950">
      <FocusHighlight />
      <EntityHeader
        entityLabel="Deal"
        createRoute="/sales/deals/create"
        totalCount={totalCount}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        pipelineOptions={PIPELINE_OPTIONS}
        activePipeline={activePipeline}
        onPipelineChange={(pipeline) => {
          setActivePipeline(pipeline as DealPipeline);
          setFilters(EMPTY_DEAL_FILTERS);
        }}
        importOptions={importOptions}
        actionOptions={actionOptions}
        footerOptions={footerOptions}
      />

      <div className="mt-3 flex items-start gap-4">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterDealsPanel
              stageOptions={stageOptions}
              filters={filters}
              onToggleField={handleToggleField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div
          key={`${viewMode}-${activePipeline}`}
          className={cn("flex-1 overflow-x-auto", viewEnter)}
        >
          {viewMode === "kanban" ? (
            <DealsKanbanBoard
              pipeline={activePipeline}
              filters={filters}
              visibleColumnIds={visibleColumnIds}
            />
          ) : (
            <DealsListView pipeline={activePipeline} filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
