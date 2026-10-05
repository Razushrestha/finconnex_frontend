"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Download,
  ChevronDown,
  Copy,
} from "lucide-react";
import {
  EntityHeader,
  type ImportOption,
  type ActionOption,
  type SortDirection,
  ScopeOption,
} from "@/components/sales/EntityHeader";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { DealsKanbanBoard } from "@/components/sales/deals/DealsKanbanBoard";
import { DealsListView } from "@/components/sales/deals/DealsListView";
import { CreateDealForm } from "@/components/sales/deals/CreateDealForm";
import {
  DEAL_CURRENCIES,
  DEAL_PIPELINES,
  DEAL_PIPELINE_STAGES,
  DEAL_STAGES,
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import {
  listDealPipelines,
  saveDealPipelines,
  deleteDeals,
  updateDeal,
  updateDealOwners,
} from "@/lib/deals/store";
import { useCrmDeals } from "@/lib/deals/use-crm-deals";
import { bulkCrmDeals, tryCrmDeal } from "@/lib/deals/api";
import { emitRulesChange } from "@/lib/rules/storage";
import {
  applyDealImport,
  cloneDeal,
  DEAL_IMPORT_FIELDS,
  defaultDealImportSettings,
  downloadDealImportErrorReport,
  exportDealsCsv,
  previewDealImport,
  sampleDealCsvTemplate,
  suggestDealMapping,
} from "@/lib/deals/import";
import { EntityCsvImportModal } from "@/components/sales/import/EntityCsvImportModal";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { onRulesChange } from "@/lib/rules";
import {
  FilterDealsPanel,
  EMPTY_DEAL_FILTERS,
  type DealFilters,
} from "@/components/sales/deals/FilterDealsPanel";
import { viewEnter } from "@/lib/motion";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { SORT_OPTIONS } from "../leads/page";
import { defaultActorName } from "@/lib/rules/actor";
import { bindKanbanStageTitle } from "@/lib/kanban/stage-titles";
import {
  KANBAN_HEADER_PALETTE,
  type KanbanViewConfig,
} from "@/components/common/KanbanViewControls";

export interface PipelineOption {
  label: string;
  value: string;
}

const PIPELINE_OPTIONS: PipelineOption[] = DEAL_PIPELINES.map((pipeline) => ({
  label: pipeline,
  value: pipeline,
}));

const DEAL_SCOPE_OPTIONS: ScopeOption[] = [
  { label: "All Deals", value: "all" },
  { label: "My Deals", value: "mine" },
  { label: "Follower Deals", value: "follower" },
];

export default function DealsPage() {
  const router = useRouter();
  const crm = useCrmDeals();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<DealFilters>(EMPTY_DEAL_FILTERS);
  const [activePipeline, setActivePipeline] = useState<DealPipeline>(
    DEAL_PIPELINES[0],
  );

  const [allStages, setAllStages] =
    useState<Record<DealPipeline, DealStage[]>>(DEAL_PIPELINE_STAGES);

  const [activeScope, setActiveScope] = useState("all");

  const [activeSort, setActiveSort] = useState("Sort");
  const [activeSortDirection, setActiveSortDirection] =
    useState<SortDirection>("asc");

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    setCreateOpen(true);
    router.replace("/sales/deals", { scroll: false });
  }, [router]);

  function openCreateDeal() {
    setCreateOpen(true);
  }

  // Selection state for deals across columns/list items
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPipelineMenuOpen, setIsPipelineMenuOpen] = useState(false);
  const pipelineMenuRef = useRef<HTMLDivElement>(null);

  const [isImportDealsOpen, setIsImportDealsOpen] = useState(false);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const defaults = defaultDealImportSettings();

  useEffect(() => {
    function refresh() {
      setAllStages(listDealPipelines());
    }
    if (!crm.loading) refresh();
    return onRulesChange(refresh);
  }, [crm.source, crm.loading]);

  useEffect(() => {
    if (!bulkFlash) return;
    const t = window.setTimeout(() => setBulkFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [bulkFlash]);

  const [viewConfigs, setViewConfigs] = useState<
    Record<DealPipeline, KanbanViewConfig>
  >(
    () =>
      Object.fromEntries(
        DEAL_PIPELINES.map((pipeline) => [
          pipeline,
          {
            id: pipeline,
            name: pipeline,
            categorizeBy: "Stage",
            aggregateBy: "Loan Amount",
            headerStyle: "Multi Colour",
            shareWith: "everyone",
            selectedFieldIds: [
              "dealName",
              "loanAmount",
              "broker",
              "dealOwner",
              "tag",
            ],
            editableFieldIds: ["dealOwner"],
            selectedStageIds: DEAL_PIPELINE_STAGES[pipeline].map((s) => s.id),
            stageLabels: {},
            multiHeaderColors: Object.fromEntries(
              DEAL_PIPELINE_STAGES[pipeline].map((stage, index) => [
                stage.id,
                KANBAN_HEADER_PALETTE[index % KANBAN_HEADER_PALETTE.length],
              ]),
            ),
          },
        ]),
      ) as Record<DealPipeline, KanbanViewConfig>,
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("finconnex.deals.kanban-views");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, KanbanViewConfig>;
      setViewConfigs((prev) => {
        const next = { ...prev };
        for (const pipeline of DEAL_PIPELINES) {
          if (parsed[pipeline]) next[pipeline] = { ...prev[pipeline], ...parsed[pipeline] };
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, []);

  const activeViewConfig = viewConfigs[activePipeline];

  function updateActiveViewConfig(patch: Partial<KanbanViewConfig>) {
    setViewConfigs((prev) => {
      const next = {
        ...prev,
        [activePipeline]: {
          ...prev[activePipeline],
          ...patch,
        },
      };
      try {
        localStorage.setItem(
          "finconnex.deals.kanban-views",
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function applyStageVisibility(
    stageIds: string[],
    pipeline: DealPipeline = activePipeline,
  ) {
    const allowed = new Set(stageIds);
    const next = { ...allStages };
    const stages = next[pipeline] ?? [];
    const mapped = stages.map((stage, index) => ({
      ...stage,
      visible: allowed.has(stage.id) || (index === 0 && !allowed.size),
    }));
    if (!mapped.some((stage) => stage.visible ?? true)) {
      if (mapped[0]) mapped[0] = { ...mapped[0], visible: true };
    }
    next[pipeline] = mapped;
    setAllStages(next);
    saveDealPipelines(next);
  }

  function toggleDealStageColumn(columnId: string) {
    const stages = currentPipelineStages;
    const target = stages.find((stage) => stage.id === columnId);
    if (!target) return;
    const index = stages.findIndex((stage) => stage.id === columnId);
    const isVisible = target.visible ?? true;
    if (index === 0 && isVisible) return;
    const nextIds = stages
      .filter((stage) =>
        stage.id === columnId ? !isVisible : stage.visible ?? true,
      )
      .map((stage) => stage.id);
    if (!nextIds.length) return;
    applyStageVisibility(nextIds);
    updateActiveViewConfig({ selectedStageIds: nextIds });
  }

  function renameDealStageColumn(columnId: string, nextLabel: string) {
    updateActiveViewConfig({
      stageLabels: {
        ...(activeViewConfig.stageLabels ?? {}),
        [columnId]: nextLabel,
      },
    });
  }

  function editDealStage(
    columnId: string,
    next: { label: string; color?: string },
  ) {
    updateActiveViewConfig({
      headerStyle: "Multi Colour",
      stageLabels: {
        ...(activeViewConfig.stageLabels ?? {}),
        [columnId]: next.label,
      },
      multiHeaderColors: next.color
        ? {
            ...(activeViewConfig.multiHeaderColors ?? {}),
            [columnId]: next.color,
          }
        : activeViewConfig.multiHeaderColors,
    });
  }

  function addDealStageColumnTitle(title: string, color?: string) {
    const bound = bindKanbanStageTitle({
      stages: dealAvailableStages,
      selectedStageIds: visibleColumnIds,
      stageLabels: activeViewConfig.stageLabels ?? {},
      title,
    });
    if (!bound.ok) {
      setBulkFlash(bound.error);
      return;
    }
    applyStageVisibility(bound.selectedStageIds);
    updateActiveViewConfig({
      headerStyle: "Multi Colour",
      selectedStageIds: bound.selectedStageIds,
      stageLabels: bound.stageLabels,
      multiHeaderColors: color
        ? {
            ...(activeViewConfig.multiHeaderColors ?? {}),
            [bound.stageId]: color,
          }
        : activeViewConfig.multiHeaderColors,
    });
  }

  function reorderDealStageColumn(
    draggedId: string,
    targetId: string,
    place: "before" | "after" = "before",
  ) {
    const current = visibleColumnIds;
    const from = current.indexOf(draggedId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0) return;
    let insert = place === "after" ? to + 1 : to;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    if (from < insert) insert -= 1;
    if (insert === from) return;
    next.splice(insert, 0, moved);
    applyStageVisibility(next);
    updateActiveViewConfig({ selectedStageIds: next });
  }

  function exportTasks() {
    const n = exportDealsCsv({ pipeline: activePipeline });
    setBulkFlash(`Exported ${n} deals`);
  }

  function exportSelected() {
    if (!selectedIds.length) return;
    const n = exportDealsCsv({ ids: selectedIds });
    setBulkFlash(`Exported ${n} selected deals`);
  }

  function cloneSelected() {
    if (selectedIds.length !== 1) {
      setBulkFlash("Select exactly one deal to clone");
      return;
    }
    const result = cloneDeal(selectedIds[0]!);
    if (!result.ok) {
      setBulkFlash(result.message);
      return;
    }
    setBulkFlash(`Cloned as “${result.name}”`);
    setSelectedIds([]);
  }

  function deleteSelected() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} deal(s)?`)) return;
    void tryCrmDeal(() =>
      bulkCrmDeals({ ids: selectedIds, operation: "SOFT_DELETE" }),
    );
    const n = deleteDeals(selectedIds);
    emitRulesChange("all");
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} deal${n === 1 ? "" : "s"}`);
  }

  function changeOwnerSelected() {
    const owner =
      defaultActorName();
    const n = updateDealOwners(selectedIds, owner);
    emitRulesChange("all");
    setSelectedIds([]);
    setBulkFlash(`Reassigned ${n} deal${n === 1 ? "" : "s"} to ${owner}`);
  }

  function openPrintView() {
    window.print();
  }

  const currentPipelineStages = (allStages && allStages[activePipeline]) || [];

  // Transform current pipeline stages into column options format required by EntityHeader
  const columnOptions = useMemo(() => {
    const labels = activeViewConfig.stageLabels ?? {};
    const colors = activeViewConfig.multiHeaderColors ?? {};
    const selected = (activeViewConfig.selectedStageIds ?? []).filter((id) =>
      currentPipelineStages.some((stage) => stage.id === id),
    );
    const selectedSet = new Set(selected);
    const byId = new Map(currentPipelineStages.map((stage) => [stage.id, stage]));
    const serial = [
      ...selected.map((id) => byId.get(id)).filter(Boolean),
      ...currentPipelineStages.filter((stage) => !selectedSet.has(stage.id)),
    ] as DealStage[];
    const requiredId = currentPipelineStages[0]?.id;
    return serial.map((stage, index) => ({
      id: stage.id,
      label: labels[stage.id] ?? stage.title,
      visible: selected.length
        ? selectedSet.has(stage.id)
        : (stage.visible ?? true),
      required: stage.id === requiredId,
      color:
        colors[stage.id] ||
        KANBAN_HEADER_PALETTE[index % KANBAN_HEADER_PALETTE.length],
    }));
  }, [
    currentPipelineStages,
    activeViewConfig.stageLabels,
    activeViewConfig.multiHeaderColors,
    activeViewConfig.selectedStageIds,
  ]);

  const dealColumnTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    for (const col of columnOptions) titles[col.id] = col.label;
    return titles;
  }, [columnOptions]);

  const dealAvailableStages = useMemo(
    () =>
      currentPipelineStages.map((stage) => ({
        id: stage.id,
        label: activeViewConfig.stageLabels?.[stage.id] ?? stage.title,
        required: stage.id === currentPipelineStages[0]?.id,
      })),
    [currentPipelineStages, activeViewConfig.stageLabels],
  );

  const visibleColumnIds = useMemo(
    () => columnOptions.filter((c) => c.visible).map((c) => c.id),
    [columnOptions],
  );

  const dealStageColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const col of columnOptions) {
      if (col.color) colors[col.id] = col.color;
    }
    return colors;
  }, [columnOptions]);

  const dealStageRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of currentPipelineStages) {
      counts[stage.id] = stage.deals?.length ?? 0;
    }
    return counts;
  }, [currentPipelineStages]);

  function transferDealStageAndRemove(fromId: string, toId: string) {
    const from = currentPipelineStages.find((stage) => stage.id === fromId);
    const to = currentPipelineStages.find((stage) => stage.id === toId);
    if (!from || !to) return;
    for (const deal of [...from.deals]) {
      updateDeal(deal.id, { stageTitle: to.title });
    }
    toggleDealStageColumn(fromId);
  }

  const stageOptions = useMemo(() => {
    return currentPipelineStages
      .filter((stage) => stage.visible ?? true)
      .map(
        (stage) =>
          activeViewConfig.stageLabels?.[stage.id] ?? stage.title,
      );
  }, [currentPipelineStages, activeViewConfig.stageLabels]);

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

  function handlePipelineChange(pipeline: string) {
    setActivePipeline(pipeline as DealPipeline);
    setFilters(EMPTY_DEAL_FILTERS);
    setSelectedIds([]);
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
      onClick: () =>
        setBulkFlash("Notes import comes later — use Import Deals for CSV"),
    },
  ];

  const actionOptions: ActionOption[] = [
    {
      id: "clone-deal",
      label: "Clone Deal",
      icon: <Copy className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => cloneSelected(),
    },
    {
      id: "export-tasks",
      label: "Export Deals",
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
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {crm.forecast && crm.source === "api" ? (
          <span className="text-[10px] text-slate-500">
            Forecast expected {crm.forecast.expected} · actual {crm.forecast.actual}
          </span>
        ) : null}
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
      <EntityHeader
        entityLabel="Deal"
        crmLiveStatus={crm.source === "api" ? "live" : "offline"}
        hideTitle
        createRoute="/sales/deals/create"
        onCreate={openCreateDeal}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        scopeOptions={DEAL_SCOPE_OPTIONS}
        activeScope={activeScope}
        onScopeChange={setActiveScope}
        afterScope={
          <div className="relative" ref={pipelineMenuRef}>
            <button
              type="button"
              onClick={() => setIsPipelineMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isPipelineMenuOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
            >
              <span>
                {PIPELINE_OPTIONS.find((opt) => opt.value === activePipeline)
                  ?.label ?? "Deal Pipeline"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isPipelineMenuOpen && (
              <div className="absolute left-0 z-20 mt-1.5 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {PIPELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handlePipelineChange?.(opt.value);
                      setIsPipelineMenuOpen(false);
                    }}
                    className={`flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium ${
                      opt.value === activePipeline
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        activeSortDirection={activeSortDirection}
        onSortChange={(field, direction) => {
          const next = field || "Sort";
          setActiveSort(next);
          setActiveSortDirection(direction);
          // Kanban only reorders cards inside a column, so Name A-Z often
          // looks like a no-op. List view sorts every visible deal.
          if (next !== "Sort") setViewMode("list");
        }}
        importOptions={importOptions}
        actionOptions={actionOptions}
        footerOptions={footerOptions}
        columnOptions={viewMode === "kanban" ? columnOptions : undefined}
        onColumnToggle={
          viewMode === "kanban" ? toggleDealStageColumn : undefined
        }
        onColumnRename={
          viewMode === "kanban" ? renameDealStageColumn : undefined
        }
        stageColors={viewMode === "kanban" ? dealStageColors : undefined}
        stageColorPalette={
          viewMode === "kanban" ? KANBAN_HEADER_PALETTE : undefined
        }
        onEditStage={viewMode === "kanban" ? editDealStage : undefined}
        onColumnAdd={
          viewMode === "kanban" ? addDealStageColumnTitle : undefined
        }
        onColumnReorder={
          viewMode === "kanban" ? reorderDealStageColumn : undefined
        }
        stageRecordCountById={
          viewMode === "kanban" ? dealStageRecordCounts : undefined
        }
        onStageTransferAndRemove={
          viewMode === "kanban" ? transferDealStageAndRemove : undefined
        }
      />

      {selectedIds.length > 0 ? (
        <EntitySelectionToolbar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onCreateTask={() =>
            setBulkFlash("Create task from selection — open Activities → Tasks")
          }
          onChangeOwner={changeOwnerSelected}
          onCloneSelected={cloneSelected}
          onDelete={deleteSelected}
          onExportSelectedRecords={exportSelected}
        />
      ) : (
        <div className="mt-3 flex w-fit items-center gap-2">
          {bulkFlash ? (
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
              {bulkFlash}
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterDealsPanel
              stageOptions={stageOptions}
              filters={filters}
              onChange={setFilters}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div
          key={`${viewMode}-${activePipeline}`}
          className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", viewEnter)}
        >
          {viewMode === "kanban" ? (
            <DealsKanbanBoard
              pipeline={activePipeline}
              filters={filters}
              visibleColumnIds={visibleColumnIds}
              columnTitles={dealColumnTitles}
              columnHeaderColors={dealStageColors}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onAddDeal={() => openCreateDeal()}
              sortValue={activeSort}
              sortDirection={activeSortDirection}
            />
          ) : (
            <DealsListView
              pipeline={activePipeline}
              filters={filters}
              sortValue={activeSort}
              sortDirection={activeSortDirection}
            />
          )}
        </div>
      </div>

      <EntityCsvImportModal
        open={isImportDealsOpen}
        title="Import Deals"
        entityLabel="Deal"
        fields={[...DEAL_IMPORT_FIELDS]}
        owners={ACTIVITY_OWNERS}
        statuses={DEAL_STAGES}
        sources={DEAL_CURRENCIES}
        defaultOwner={defaults.defaultOwner}
        defaultStatus={defaults.defaultStatus}
        defaultSource={defaults.defaultSource}
        requiredHint="Required: Deal Name, Account"
        identityColumnLabel="Account"
        sourceFieldLabel="Default currency"
        skipDuplicatesLabel="Skip rows whose Deal Name + Account already exist"
        updateExistingLabel="Match by Deal Name + Account and overwrite mapped fields"
        suggestMapping={suggestDealMapping}
        preview={(rows, mapping, settings) =>
          previewDealImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus,
            defaultSource: settings.defaultSource,
          })
        }
        apply={(rows, mapping, settings) =>
          applyDealImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus,
            defaultSource: settings.defaultSource,
          })
        }
        downloadErrorReport={downloadDealImportErrorReport}
        sampleTemplate={sampleDealCsvTemplate()}
        sampleFilename="deals-import-template.csv"
        onClose={() => setIsImportDealsOpen(false)}
        onImported={(s) => {
          setBulkFlash(
            `Imported ${s.imported} · updated ${s.updated} · skipped ${s.skipped}`,
          );
        }}
      />

      <CreateDealForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          crm.refresh();
        }}
      />
    </div>
  );
}
