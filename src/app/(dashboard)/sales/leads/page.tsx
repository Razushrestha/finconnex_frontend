"use client";

import { useEffect, useState } from "react";
import {
  EntityHeader,
  ImportOption,
  type ActionOption,
  type SortDirection,
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
  Pencil,
  ChevronDown,
} from "lucide-react";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";

const DEFAULT_LEAD_COLUMNS = LEAD_PIPELINE_STAGES.map((stage) => ({
  id: stageColumnId(stage),
  label: stage,
  visible: true,
}));

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

  const importOptions: ImportOption[] = [
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

  return (
    <div className="h-screen bg-background p-2 pr-3">
      {/* <FocusHighlight /> */}
      <EntityHeader
        entityLabel="Lead"
        createRoute="/sales/leads/create"
        importOptions={importOptions}
        actionOptions={actionOptions}
        footerOptions={footerOptions}
        totalCount={totalLeads}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        activeSortDirection={activeSortDirection}
        onSortChange={(field, direction) => {
          setActiveSort(field);
          setActiveSortDirection(direction);
        }}
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
            <span>Lead Pipeline</span>
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
