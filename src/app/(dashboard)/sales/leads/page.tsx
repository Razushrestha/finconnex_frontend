"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EntityHeader,
  ImportOption,
  ScopeOption,
  type ActionOption,
  type SortDirection,
} from "@/components/sales/EntityHeader";
import { LeadKanbanBoard } from "@/components/sales/leads/LeadKanbanBoard";
import { LeadListView, DEFAULT_LEAD_LIST_COLUMNS } from "@/components/sales/leads/LeadListView";
import {
  FilterLeadsPanel,
  EMPTY_LEAD_FILTERS,
  type LeadFilters,
} from "@/components/sales/leads/FilterLeadsPanel";
import { listLeadColumns, deleteLeads, updateLeadOwner } from "@/lib/leads/store";
import {
  bulkCrmLeads,
  refreshCrmLeadsBoard,
} from "@/lib/leads/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { exportLeadsCsv } from "@/lib/leads/import";
import { ImportLeadsModal } from "@/components/sales/leads/ImportLeadsModal";
import { AdsSyncModal } from "@/components/sales/leads/AdsSyncModal";
import { SheetsImportModal } from "@/components/sales/leads/SheetsImportModal";
import type { AdsPlatform } from "@/lib/leads/ads-sync";
import { LEAD_PIPELINE_STAGES } from "@/lib/leads/types";
import { stageColumnId } from "@/lib/pipeline-sla/board";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import {
  Sparkles,
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  Tag,
  ShieldCheck,
  Download,
  Pencil,
} from "lucide-react";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import {
  DEFAULT_SINGLE_HEADER_COLOR,
  KANBAN_HEADER_PALETTE,
  KanbanField,
  KanbanViewConfig,
  KanbanViewSettingsModal,
} from "@/components/common/KanbanViewControls";
import {
  ListViewSettingsModal,
  listConfigToManageColumns,
  type ListViewConfig,
} from "@/components/common/ListViewSettingsModal";
import type { ManageColumn } from "@/components/work-queue/ManageColumnsModal";
import {
  loadLeadCardSettings,
  saveLeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import {
  kanbanSelectedIdsToCardKeys,
  kanbanShowsOwnerAvatar,
} from "@/lib/leads/kanban-view-fields";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import {
  applyTablePreferenceToListView,
  getCrmTablePreference,
  isEmptyTablePreference,
  persistCrmTablePreference,
  tablePreferenceFromListView,
  tryCrmTablePreference,
} from "@/lib/table-preferences/api";

const DEFAULT_LEAD_COLUMNS = LEAD_PIPELINE_STAGES.map((stage) => ({
  id: stageColumnId(stage),
  label: stage,
  visible: true,
}));

const LEAD_FIELDS: KanbanField[] = [
  { id: "leadName", label: "Lead Name", required: true },
  { id: "source", label: "Source" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "leadOwner", label: "Lead Owner" },
  { id: "tag", label: "Tag" },
];

const HEADER_COLOR_OPTIONS = MORTGAGE_PIPELINE_STAGES.map((stage) => ({
  id: stageColumnId(stage),
  label: stage,
}));

const DEFAULT_MULTI_HEADER_COLORS: Record<string, string> =
  HEADER_COLOR_OPTIONS.reduce(
    (acc, opt, i) => {
      acc[opt.id] =
        KANBAN_HEADER_PALETTE[i % KANBAN_HEADER_PALETTE.length] ??
        DEFAULT_SINGLE_HEADER_COLOR;
      return acc;
    },
    {} as Record<string, string>,
  );

const LEAD_VIEW_STORAGE_KEY = "finconnex.leads.kanban-view";
const LEAD_LIST_STORAGE_KEY = "finconnex.leads.list-view";

const DEFAULT_LIST_VIEW: ListViewConfig = {
  id: "leads-list",
  name: "All Leads",
  sortBy: "newest",
  sortDirection: "desc",
  pageSize: 10,
  shareWith: "everyone",
  selectedColumnIds: DEFAULT_LEAD_LIST_COLUMNS.filter((c) => c.checked).map(
    (c) => c.id,
  ),
};

const LIST_SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
];

function loadListViewConfig(): ListViewConfig {
  if (typeof window === "undefined") return DEFAULT_LIST_VIEW;
  try {
    const raw = localStorage.getItem(LEAD_LIST_STORAGE_KEY);
    if (!raw) return DEFAULT_LIST_VIEW;
    const parsed = JSON.parse(raw) as Partial<ListViewConfig>;
    return {
      ...DEFAULT_LIST_VIEW,
      ...parsed,
      selectedColumnIds:
        Array.isArray(parsed.selectedColumnIds) &&
        parsed.selectedColumnIds.length
          ? parsed.selectedColumnIds
          : DEFAULT_LIST_VIEW.selectedColumnIds,
    };
  } catch {
    return DEFAULT_LIST_VIEW;
  }
}

function persistListViewConfig(config: ListViewConfig) {
  try {
    localStorage.setItem(LEAD_LIST_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

const DEFAULT_VIEW_CONFIG: KanbanViewConfig = {
  id: "leads",
  name: "Leads",
  categorizeBy: "Status",
  aggregateBy: "Lead Count",
  headerStyle: "Multi Colour",
  shareWith: "everyone",
  selectedFieldIds: ["leadName", "source", "phone", "leadOwner"],
  editableFieldIds: ["leadOwner"],
  singleHeaderColor: DEFAULT_SINGLE_HEADER_COLOR,
  multiHeaderColors: DEFAULT_MULTI_HEADER_COLORS,
};

function loadViewConfig(): KanbanViewConfig {
  if (typeof window === "undefined") return DEFAULT_VIEW_CONFIG;
  try {
    const raw = localStorage.getItem(LEAD_VIEW_STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW_CONFIG;
    const parsed = JSON.parse(raw) as Partial<KanbanViewConfig>;
    const selectedFieldIds =
      Array.isArray(parsed.selectedFieldIds) && parsed.selectedFieldIds.length
        ? parsed.selectedFieldIds
        : DEFAULT_VIEW_CONFIG.selectedFieldIds;
    return {
      ...DEFAULT_VIEW_CONFIG,
      ...parsed,
      selectedFieldIds,
      editableFieldIds: Array.isArray(parsed.editableFieldIds)
        ? parsed.editableFieldIds
        : DEFAULT_VIEW_CONFIG.editableFieldIds,
      singleHeaderColor:
        typeof parsed.singleHeaderColor === "string"
          ? parsed.singleHeaderColor
          : DEFAULT_VIEW_CONFIG.singleHeaderColor,
      multiHeaderColors: {
        ...DEFAULT_MULTI_HEADER_COLORS,
        ...(parsed.multiHeaderColors &&
        typeof parsed.multiHeaderColors === "object"
          ? parsed.multiHeaderColors
          : {}),
      },
    };
  } catch {
    return DEFAULT_VIEW_CONFIG;
  }
}

function persistViewConfig(config: KanbanViewConfig) {
  try {
    localStorage.setItem(LEAD_VIEW_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function applyViewFieldsToCards(config: KanbanViewConfig) {
  const keys = kanbanSelectedIdsToCardKeys(config.selectedFieldIds);
  const current = loadLeadCardSettings();
  // Settings store stays capped; Kanban cards use the full selection via props.
  saveLeadCardSettings({
    ...current,
    dynamicFieldKeys: keys.length ? keys : current.dynamicFieldKeys,
    showOwnerAvatar: kanbanShowsOwnerAvatar(config.selectedFieldIds),
  });
}

const LEAD_SCOPE_OPTIONS: ScopeOption[] = [
  { label: "All Leads", value: "all" },
  { label: "My Leads", value: "mine" },
  { label: "Follower Leads", value: "follower" },
];

export const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Name (A-Z)", value: "name_asc" },
  { label: "Name (Z-A)", value: "name_desc" },
];

export default function LeadsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [totalLeads, setTotalLeads] = useState(0);
  const [columns] = useState(DEFAULT_LEAD_COLUMNS);

  const [activeScope, setActiveScope] = useState("all");

  const [activeSort, setActiveSort] = useState("Sort");
  const [activeSortDirection, setActiveSortDirection] =
    useState<SortDirection>("asc");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // TODO: wire these up to the actual modals/handlers once they exist.
  const [isMassTransferOpen, setMassTransferOpen] = useState(false);
  const [isMassDeleteOpen, setMassDeleteOpen] = useState(false);
  const [isMassUpdateOpen, setMassUpdateOpen] = useState(false);
  const [isManageTagsOpen, setManageTagsOpen] = useState(false);
  const [isAssignmentRulesOpen, setAssignmentRulesOpen] = useState(false);
  const [crmSource, setCrmSource] = useState<"api" | "demo">("demo");
  const [crmLoading, setCrmLoading] = useState(true);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [isImportOpen, setImportOpen] = useState(false);
  const [adsPlatform, setAdsPlatform] = useState<AdsPlatform | null>(null);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);

  const [isKanbanSettingsOpen, setIsKanbanSettingsOpen] = useState(false);
  const [isListSettingsOpen, setIsListSettingsOpen] = useState(false);
  const [viewConfig, setViewConfig] = useState<KanbanViewConfig>(
    DEFAULT_VIEW_CONFIG,
  );
  const [listViewConfig, setListViewConfig] =
    useState<ListViewConfig>(DEFAULT_LIST_VIEW);

  const cardFieldKeys = useMemo(
    () => kanbanSelectedIdsToCardKeys(viewConfig.selectedFieldIds),
    [viewConfig.selectedFieldIds],
  );
  const showOwnerOnCard = kanbanShowsOwnerAvatar(viewConfig.selectedFieldIds);

  const listManageColumns = useMemo(
    () =>
      listConfigToManageColumns(
        DEFAULT_LEAD_LIST_COLUMNS,
        listViewConfig.selectedColumnIds,
      ),
    [listViewConfig.selectedColumnIds],
  );

  function exportTasks() {
    const n = exportLeadsCsv();
    setBulkFlash(`Exported ${n} leads`);
  }

  function exportSelected() {
    if (!selectedIds.length) return;
    const n = exportLeadsCsv({ ids: selectedIds });
    setBulkFlash(`Exported ${n} selected leads`);
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected lead(s)?`)) return;
    const liveIds = selectedIds.filter(isUuid);
    if (liveIds.length) {
      try {
        await bulkCrmLeads({ ids: liveIds, operation: "SOFT_DELETE" });
        await refreshCrmLeadsBoard();
      } catch (err) {
        setBulkFlash(err instanceof Error ? err.message : "Delete failed");
        return;
      }
    }
    const localIds = selectedIds.filter((id) => !isUuid(id));
    const n = localIds.length ? deleteLeads(localIds) : liveIds.length;
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} lead(s)`);
  }

  async function changeOwnerSelected() {
    if (!selectedIds.length) return;
    const owner = window.prompt(
      `Assign owner UUID for ${selectedIds.length} lead(s).\nPaste a workspace member user id.`,
      "",
    );
    if (!owner?.trim()) return;
    if (!isUuid(owner.trim())) {
      const n = updateLeadOwner(selectedIds, owner.trim());
      setBulkFlash(`Updated local owner on ${n} lead(s)`);
      return;
    }
    try {
      await bulkCrmLeads({
        ids: selectedIds.filter(isUuid),
        operation: "ASSIGN_OWNER",
        ownerId: owner.trim(),
      });
      await refreshCrmLeadsBoard();
      setBulkFlash("Owner updated");
    } catch (err) {
      setBulkFlash(err instanceof Error ? err.message : "Owner update failed");
    }
  }

  function openPrintView() {
    console.log("print view clicked");
  }

  function openViewSettings() {
    if (viewMode === "list") {
      setIsListSettingsOpen(true);
      return;
    }
    setIsKanbanSettingsOpen(true);
  }

  useEffect(() => {
    let cancelled = false;
    setCrmLoading(true);
    setCrmError(null);
    void (async () => {
      try {
        const ok = await refreshCrmLeadsBoard();
        if (cancelled) return;
        setCrmSource(ok ? "api" : "demo");
        if (!ok) setCrmError("CRM unavailable — showing local board");
      } catch (err) {
        if (cancelled) return;
        setCrmSource("demo");
        setCrmError(err instanceof Error ? err.message : "CRM unavailable");
      } finally {
        if (!cancelled) setCrmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bulkFlash) return;
    const t = window.setTimeout(() => setBulkFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [bulkFlash]);

  useEffect(() => {
    setViewConfig(loadViewConfig());
    setListViewConfig(loadListViewConfig());
    void tryCrmTablePreference(() => getCrmTablePreference("leads")).then(
      (pref) => {
        if (pref && !isEmptyTablePreference(pref)) {
          setListViewConfig((current) =>
            applyTablePreferenceToListView(current, pref),
          );
        }
      },
    );
  }, []);

  useEffect(() => {
    function refresh() {
      setTotalLeads(
        listLeadColumns().reduce((sum, column) => sum + column.cards.length, 0),
      );
    }
    refresh();
    return onRulesChange(() => refresh());
  }, [viewMode]);

  function saveKanbanView(next: KanbanViewConfig) {
    setViewConfig(next);
    persistViewConfig(next);
    applyViewFieldsToCards(next);
    setIsKanbanSettingsOpen(false);
  }

  function saveListView(next: ListViewConfig) {
    const normalized: ListViewConfig = {
      ...next,
      selectedColumnIds: next.selectedColumnIds.length
        ? next.selectedColumnIds
        : DEFAULT_LIST_VIEW.selectedColumnIds,
    };
    setListViewConfig(normalized);
    persistListViewConfig(normalized);
    persistCrmTablePreference(
      "leads",
      tablePreferenceFromListView("leads", normalized),
    );
    setIsListSettingsOpen(false);
  }

  function handleListManageColumnsChange(cols: ManageColumn[]) {
    const next: ListViewConfig = {
      ...listViewConfig,
      selectedColumnIds: cols.filter((c) => c.checked).map((c) => c.id),
    };
    setListViewConfig(next);
    persistListViewConfig(next);
    persistCrmTablePreference(
      "leads",
      tablePreferenceFromListView("leads", next),
    );
  }

  function handleListPageSizeChange(size: number) {
    const next: ListViewConfig = { ...listViewConfig, pageSize: size };
    setListViewConfig(next);
    persistListViewConfig(next);
    persistCrmTablePreference(
      "leads",
      tablePreferenceFromListView("leads", next),
    );
  }

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

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const visibleColumnIds = columns.filter((c) => c.visible).map((c) => c.id);

  const importOptions: ImportOption[] = [
    {
      id: "import-leads",
      label: "Import Leads",
      badge: "New",
      onClick: () => setImportOpen(true),
    },
    {
      id: "import-notes",
      label: "Import Notes",
      onClick: () =>
        setBulkFlash("Notes import comes next — use Import Leads for CSV now"),
    },
    {
      id: "facebook-ads-sync",
      label: "Facebook Ads Sync",
      onClick: () => setAdsPlatform("facebook"),
    },
    {
      id: "linkedin-ads-sync",
      label: "LinkedIn Ads Sync",
      onClick: () => setAdsPlatform("linkedin"),
    },
    {
      id: "tiktok-ads-sync",
      label: "Tiktok Ads Sync",
      onClick: () => setAdsPlatform("tiktok"),
    },
    {
      id: "google-ads-sync",
      label: "Google Ads Sync",
      onClick: () => setAdsPlatform("google"),
    },
    {
      id: "google-sheets-import",
      label: "Google Sheets Import",
      onClick: () => setSheetsOpen(true),
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
      label: "Export Leads",
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
      {/* <FocusHighlight /> */}
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crmSource === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crmSource === "api"
            ? "Live CRM"
            : crmLoading
              ? "Connecting…"
              : "Demo"}
        </span>
        {crmError && crmSource === "demo" ? (
          <span className="text-[10px] text-slate-500">{crmError}</span>
        ) : null}
      </div>
      <div className="shrink-0">
        <EntityHeader
          entityLabel="Lead"
          createRoute="/sales/leads/create"
          importOptions={importOptions}
          actionOptions={actionOptions}
          footerOptions={footerOptions}
          hideTitle
          totalCount={totalLeads}
          afterScope={
            <button
              type="button"
              onClick={openViewSettings}
              aria-label={
                viewMode === "list"
                  ? "Edit list view settings"
                  : "Edit Kanban view settings"
              }
              title={
                viewMode === "list"
                  ? "List View Settings"
                  : "Kanban View Settings"
              }
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm hover:text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          }
          viewMode={viewMode}
          onViewChange={setViewMode}
          isFilterOpen={isFilterOpen}
          onToggleFilter={() => setIsFilterOpen((v) => !v)}
          scopeOptions={LEAD_SCOPE_OPTIONS}
          activeScope={activeScope}
          onScopeChange={setActiveScope}
          sortOptions={SORT_OPTIONS}
          activeSort={activeSort}
          activeSortDirection={activeSortDirection}
          onSortChange={(field, direction) => {
            setActiveSort(field);
            setActiveSortDirection(direction);
          }}
        />

        {selectedIds.length > 0 ? (
          <>
            {bulkFlash ? (
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                {bulkFlash}
              </div>
            ) : null}
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
            onChangeOwner={() => changeOwnerSelected()}
            onCadences={() => console.log("cadences clicked")}
            onAddToCampaigns={() => console.log("add to campaigns clicked")}
            onPrintMailingLabels={() =>
              console.log("print mailing labels clicked")
            }
            onMailMerge={() => console.log("mail merge clicked")}
            onMassConvert={() => console.log("mass convert clicked")}
            onDelete={() => deleteSelected()}
            onExportSelectedRecords={() => exportSelected()}
          />
          </>
        ) : bulkFlash ? (
          <div className="mt-3 flex w-fit items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
              {bulkFlash}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {isFilterOpen && (
          <div className="shrink-0 overflow-y-auto">
            <FilterLeadsPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div
          key={viewMode}
          className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", viewEnter)}
        >
          {viewMode === "kanban" ? (
            <LeadKanbanBoard
              filters={filters}
              visibleColumnIds={visibleColumnIds}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              cardFieldKeys={cardFieldKeys}
              showOwnerAvatar={showOwnerOnCard}
              headerStyle={viewConfig.headerStyle}
              singleHeaderColor={viewConfig.singleHeaderColor}
              multiHeaderColors={viewConfig.multiHeaderColors}
            />
          ) : (
            <div className="h-full overflow-auto">
              <LeadListView
                filters={filters}
                manageColumns={listManageColumns}
                onManageColumnsChange={handleListManageColumnsChange}
                pageSize={listViewConfig.pageSize}
                onPageSizeChange={handleListPageSizeChange}
                onOpenListSettings={() => setIsListSettingsOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {isKanbanSettingsOpen && (
        <KanbanViewSettingsModal
          view={viewConfig}
          availableFields={LEAD_FIELDS}
          categorizeByOptions={["Status", "Source", "Lead Owner"]}
          aggregateByOptions={["Lead Count"]}
          headerStyleOptions={["Multi Colour", "Single Colour", "None"]}
          headerColorOptions={HEADER_COLOR_OPTIONS}
          onClose={() => setIsKanbanSettingsOpen(false)}
          onSave={saveKanbanView}
          onDelete={() => {
            setIsKanbanSettingsOpen(false);
          }}
        />
      )}

      {isListSettingsOpen && (
        <ListViewSettingsModal
          open={isListSettingsOpen}
          view={listViewConfig}
          availableColumns={DEFAULT_LEAD_LIST_COLUMNS}
          sortOptions={LIST_SORT_OPTIONS}
          onClose={() => setIsListSettingsOpen(false)}
          onSave={saveListView}
          onDelete={() => setIsListSettingsOpen(false)}
        />
      )}

      <ImportLeadsModal
        open={isImportOpen}
        onClose={() => setImportOpen(false)}
        onImported={(s) => {
          setBulkFlash(
            `Imported ${s.imported} · updated ${s.updated} · skipped ${s.skipped}`,
          );
          setTotalLeads(
            listLeadColumns().reduce((sum, column) => sum + column.cards.length, 0),
          );
        }}
      />

      {adsPlatform ? (
        <AdsSyncModal
          open
          platform={adsPlatform}
          onClose={() => setAdsPlatform(null)}
          onSynced={(s) => {
            setBulkFlash(
              `Ad sync: imported ${s.imported}` +
                (s.skipped ? ` · skipped ${s.skipped}` : ""),
            );
            setTotalLeads(
              listLeadColumns().reduce(
                (sum, column) => sum + column.cards.length,
                0,
              ),
            );
          }}
        />
      ) : null}

      <SheetsImportModal
        open={sheetsOpen}
        onClose={() => setSheetsOpen(false)}
        onImported={(s) => {
          setBulkFlash(
            `Sheets: imported ${s.imported}` +
              (s.updated ? ` · updated ${s.updated}` : "") +
              (s.skipped ? ` · skipped ${s.skipped}` : ""),
          );
          setTotalLeads(
            listLeadColumns().reduce(
              (sum, column) => sum + column.cards.length,
              0,
            ),
          );
        }}
      />
    </div>
  );
}
