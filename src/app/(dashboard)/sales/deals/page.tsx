"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  deleteDeals,
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
import {
  type KanbanField,
  type KanbanViewConfig,
  KanbanViewSettingsModal,
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

const DEAL_FIELDS: KanbanField[] = [
  { id: "dealName", label: "Deal Name", required: true },
  { id: "loanAmount", label: "Loan Amount" },
  { id: "closeDate", label: "Close Date" },
  { id: "broker", label: "Broker" },
  { id: "dealOwner", label: "Deal Owner" },
  { id: "lender", label: "Lender" },
  { id: "tag", label: "Tag" },
];

export default function DealsPage() {
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Selection state for deals across columns/list items
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPipelineMenuOpen, setIsPipelineMenuOpen] = useState(false);
  const pipelineMenuRef = useRef<HTMLDivElement>(null);

  const [isImportDealsOpen, setIsImportDealsOpen] = useState(false);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const defaults = defaultDealImportSettings();

  // TODO: wire these up to the actual modals/handlers once they exist.
  const [isMassTransferOpen, setMassTransferOpen] = useState(false);
  const [isMassDeleteOpen, setMassDeleteOpen] = useState(false);
  const [isMassUpdateOpen, setMassUpdateOpen] = useState(false);
  const [isManageTagsOpen, setManageTagsOpen] = useState(false);
  const [isAssignmentRulesOpen, setAssignmentRulesOpen] = useState(false);

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
          },
        ]),
      ) as Record<DealPipeline, KanbanViewConfig>,
  );

  const activeViewConfig = viewConfigs[activePipeline];

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
      bulkCrmDeals({ ids: selectedIds, operation: "DELETE" }),
    );
    const n = deleteDeals(selectedIds);
    emitRulesChange("all");
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} deal${n === 1 ? "" : "s"}`);
  }

  function changeOwnerSelected() {
    const owner =
      ACTIVITY_OWNERS.find((o) => o !== "John Smith") ?? ACTIVITY_OWNERS[0];
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
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crm.source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crm.source === "api"
            ? "Live CRM"
            : crm.loading
              ? "Connecting…"
              : "Demo"}
        </span>
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
        createRoute="/sales/deals/create"
        totalCount={totalCount}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        scopeOptions={DEAL_SCOPE_OPTIONS}
        activeScope={activeScope}
        onScopeChange={setActiveScope}
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
          <div className="relative" ref={pipelineMenuRef}>
            <button
              type="button"
              onClick={() => setIsPipelineMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isPipelineMenuOpen}
              className="flex items-center gap-1.5 rounded-sm bg-white hover:bg-white px-3 py-1 text-sm font-medium text-foreground/70"
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

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Edit Kanban view settings"
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm hover:text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-300"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {isSettingsOpen && (
        <KanbanViewSettingsModal
          view={activeViewConfig}
          availableFields={DEAL_FIELDS}
          categorizeByOptions={["Stage", "Lender", "Broker"]}
          aggregateByOptions={["Loan Amount", "Deal Count", "Commission"]}
          headerStyleOptions={["Multi Colour", "Single Colour", "None"]}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(next) => {
            setViewConfigs((prev) => ({ ...prev, [activePipeline]: next }));
            setIsSettingsOpen(false);
            // e.g. api.updateKanbanView(activePipeline, next);
          }}
          onDelete={() => {
            setIsSettingsOpen(false);
            // e.g. api.deleteKanbanView(activePipeline);
          }}
        />
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
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <DealsListView pipeline={activePipeline} filters={filters} />
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
    </div>
  );
}
