"use client";

import { useState } from "react";
import {
  ActionOption,
  EntityHeader,
  type SortDirection,
} from "@/components/sales/EntityHeader";
import { CompaniesKanbanBoard } from "@/components/sales/companies/CompaniesKanbanBoard";
import { CompaniesListView } from "@/components/sales/companies/CompaniesListView";
import {
  FilterCompaniesPanel,
  EMPTY_COMPANY_FILTERS,
  type CompanyFilters,
} from "@/components/sales/companies/FilterCompaniesPanel";
import { COMPANY_GROUPS, type CompanyGroup } from "@/lib/companies/types";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Download,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { SORT_OPTIONS } from "../leads/page";
import type { CompanyQuickActionKind } from "@/components/sales/companies/CompanyCard";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";

type CompanyRecord = CompanyGroup["companies"][number];

const DEFAULT_COMPANY_COLUMNS = COMPANY_GROUPS.map((group) => ({
  id: group.id,
  label: group.title,
  visible: true,
}));

export default function CompaniesPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<CompanyFilters>(EMPTY_COMPANY_FILTERS);
  const [columns, setColumns] = useState(DEFAULT_COMPANY_COLUMNS);

  const [activeSort, setActiveSort] = useState("Sort");
  const [activeSortDirection, setActiveSortDirection] =
    useState<SortDirection>("asc");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  function handleQuickAction(
    kind: CompanyQuickActionKind,
    company: CompanyRecord,
  ) {
    console.log(`Quick action "${kind}" triggered for company:`, company.name);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleFilterField(section: "status" | "source", field: string) {
    setFilters((prev) => {
      const key = section === "source" ? "sources" : "statuses";
      const current = prev[key] as string[];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, [key]: next };
    });
  }

  function reorderColumn(draggedId: string, targetId: string) {
    setColumns((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((c) => c.id === draggedId);
      const toIndex = next.findIndex((c) => c.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  const visibleColumnIds = columns.filter((c) => c.visible).map((c) => c.id);

  const totalCompanies = COMPANY_GROUPS.reduce(
    (sum, group) => sum + group.companies.length,
    0,
  );

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
    <div className="h-screen bg-slate-50 p-2 pr-3 dark:bg-zinc-950">
      <FocusHighlight />
      <EntityHeader
        entityLabel="Company"
        entityLabelPlural="Companies"
        createRoute="/sales/companies/create"
        importOptions={[
          {
            id: "import-companies",
            label: "Import Companies",
            badge: "New",
            onClick: () => console.log("button clicked"),
          },
          {
            id: "import-notes",
            label: "Import Notes",
            onClick: () => console.log("button clicked"),
          },
        ]}
        totalCount={totalCompanies}
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
      ) : null}

      <div className="mt-3 flex items-start gap-4">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterCompaniesPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div key={viewMode} className={cn("flex-1 overflow-x-auto", viewEnter)}>
          {viewMode === "kanban" ? (
            <CompaniesKanbanBoard
              filters={filters}
              visibleColumnIds={visibleColumnIds}
              onQuickAction={handleQuickAction}
            />
          ) : (
            <CompaniesListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
