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
  Pencil,
  ChevronDown,
} from "lucide-react";
import {
  EntityHeader,
  type PipelineOption,
  type ImportOption,
  type ActionOption,
  type SortDirection,
} from "@/components/sales/EntityHeader";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
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
import { SORT_OPTIONS } from "../leads/page";

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

  const [activeSort, setActiveSort] = useState("Sort");
  const [activeSortDirection, setActiveSortDirection] =
    useState<SortDirection>("asc");

  // Selection state for deals across columns/list items
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const allVisibleDealIds = useMemo(() => {
    const ids: string[] = [];
    currentPipelineStages
      .filter(
        (stage) =>
          (stage.visible ?? true) && visibleColumnIds.includes(stage.id),
      )
      .forEach((stage) => {
        stage.deals?.forEach((deal) => {
          ids.push(deal.id);
        });
      });
    return ids;
  }, [currentPipelineStages, visibleColumnIds]);

  const totalCount = allVisibleDealIds.length;

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === allVisibleDealIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...allVisibleDealIds]);
    }
  }

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
          setSelectedIds([]);
        }}
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        activeSortDirection={activeSortDirection}
        onSortChange={(field, direction) => {
          setActiveSort(field);
          setActiveSortDirection(direction);
        }}
        importOptions={importOptions}
        actionOptions={actionOptions}
        footerOptions={footerOptions}
      />

      {selectedIds.length > 0 ? (
        <EntitySelectionToolbar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onSendMail={() => console.log("send mail clicked")}
          onAddTag={() => console.log("add tag clicked")}
          onRemoveTag={() => console.log("remove tag clicked")}
          onRunMacro={() => console.log("run macro clicked")}
          onCreateTask={() => console.log("create task clicked")}
          onSetReminder={() => console.log("set reminder clicked")}
          onMassUpdate={() => console.log("mass update clicked")}
          onChangeOwner={() => console.log("change owner clicked")}
          onCadences={() => console.log("cadences clicked")}
          onAddToCampaigns={() => console.log("add to campaigns clicked")}
          onPrintMailingLabels={() =>
            console.log("print mailing labels clicked")
          }
          onMailMerge={() => console.log("mail merge clicked")}
          onMassConvert={() => console.log("mass convert clicked")}
          onDelete={() => console.log("delete clicked")}
          onExportSelectedRecords={() =>
            console.log("export selected records clicked")
          }
        />
      ) : (
        <div className="mt-3 flex w-fit items-center gap-2">
          <button
            type="button"
            onClick={() => console.log("pipeline selector clicked")}
            className="flex items-center gap-1.5 rounded-sm bg-card/70 hover:bg-card px-3 py-1 text-sm font-medium text-foreground/70"
          >
            <span>Deal Pipeline</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => console.log("edit pipeline clicked")}
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm hover:text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-300"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <DealsListView pipeline={activePipeline} filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
