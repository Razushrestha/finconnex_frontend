"use client";

import { useEffect, useState } from "react";
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
import {
  COMPANY_GROUPS,
  COMPANY_STATUSES,
  type CompanyGroup,
  type CompanyStatus,
} from "@/lib/companies/types";
import {
  deleteCompany,
  findCompanyById,
  listCompanyGroups,
  updateCompany,
} from "@/lib/companies/store";
import { useCrmCompanies } from "@/lib/companies/use-crm-companies";
import {
  applyCompanyImport,
  COMPANY_IMPORT_FIELDS,
  COMPANY_INDUSTRIES,
  defaultCompanyImportSettings,
  downloadCompanyImportErrorReport,
  exportCompaniesCsv,
  previewCompanyImport,
  sampleCompanyCsvTemplate,
  suggestCompanyMapping,
} from "@/lib/companies/import";
import {
  bulkCrmCompanies,
  exportCrmCompanies,
  importCrmCompanies,
  tryCrmCompany,
} from "@/lib/companies/api";
import { EntityCsvImportModal } from "@/components/sales/import/EntityCsvImportModal";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import {
  ArrowLeftRight,
  Download,
  GitMerge,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { SORT_OPTIONS } from "../leads/page";
import type { CompanyQuickActionKind } from "@/components/sales/companies/CompanyCard";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { uniqueTags } from "@/lib/tags";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { MergeRecordsModal } from "@/components/sales/merge/MergeRecordsModal";

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
  const [isImportOpen, setImportOpen] = useState(false);
  const [isMergeOpen, setMergeOpen] = useState(false);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const defaults = defaultCompanyImportSettings();

  const [isMassTransferOpen, setMassTransferOpen] = useState(false);
  const [isMassDeleteOpen, setMassDeleteOpen] = useState(false);
  const [isMassUpdateOpen, setMassUpdateOpen] = useState(false);
  const [isManageTagsOpen, setManageTagsOpen] = useState(false);
  const [isAssignmentRulesOpen, setAssignmentRulesOpen] = useState(false);
  const crm = useCrmCompanies();

  useEffect(() => {
    function refresh() {
      setTotalCompanies(
        listCompanyGroups().reduce((n, g) => n + g.companies.length, 0),
      );
    }
    refresh();
    return onRulesChange(refresh);
  }, [crm.source, crm.loading]);

  useEffect(() => {
    if (!bulkFlash) return;
    const t = window.setTimeout(() => setBulkFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [bulkFlash]);

  function exportTasks() {
    const n = exportCompaniesCsv();
    void tryCrmCompany(() => exportCrmCompanies({}));
    setBulkFlash(`Exported ${n} companies`);
  }

  function exportSelected() {
    if (!selectedIds.length) return;
    const n = exportCompaniesCsv({ ids: selectedIds });
    void tryCrmCompany(() => exportCrmCompanies({ ids: selectedIds }));
    setBulkFlash(`Exported ${n} selected companies`);
  }

  function runBulkDelete() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} compan${count === 1 ? "y" : "ies"}? This moves them to the recycle bin.`,
      )
    ) {
      return;
    }
    let n = 0;
    for (const id of selectedIds) {
      if (deleteCompany(id, { skipCrm: true })) n += 1;
    }
    if (n) {
      void tryCrmCompany(() =>
        bulkCrmCompanies({ ids: selectedIds, operation: "DELETE" }),
      );
    }
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} compan${n === 1 ? "y" : "ies"}`);
  }

  function openPrintView() {
    window.print();
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
      id: "merge-companies",
      label: "Merge Companies",
      icon: <GitMerge className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setMergeOpen(true),
    },
    {
      id: "export-tasks",
      label: "Export Companies",
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

  void isMassTransferOpen;
  void isMassDeleteOpen;
  void isMassUpdateOpen;
  void isManageTagsOpen;
  void isAssignmentRulesOpen;
  void columns;
  void setColumns;
  void activeSortDirection;

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
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
      <EntityHeader
        entityLabel="Company"
        entityLabelPlural="Companies"
        createRoute="/sales/companies/create"
        importOptions={[
          {
            id: "import-companies",
            label: "Import Companies",
            badge: "New",
            onClick: () => setImportOpen(true),
          },
          {
            id: "import-notes",
            label: "Import Notes",
            onClick: () =>
              setBulkFlash("Notes import comes later — use Import Companies"),
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
          onAddTag={(tag) => {
            let n = 0;
            for (const id of selectedIds) {
              const found = findCompanyById(id);
              if (!found) continue;
              updateCompany(found.company.id, {
                tags: uniqueTags([...(found.company.tags ?? []), tag]),
              });
              n += 1;
            }
            setBulkFlash(`Tagged ${n} compan${n === 1 ? "y" : "ies"} with #${tag}`);
          }}
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
          onMailMerge={() => setMergeOpen(true)}
          onMassConvert={() => console.log("mass convert clicked")}
          onDelete={runBulkDelete}
          onExportSelectedRecords={() => exportSelected()}
        />
      ) : bulkFlash ? (
        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          {bulkFlash}
        </div>
      ) : null}

      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterCompaniesPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div key={viewMode} className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", viewEnter)}>
          {viewMode === "kanban" ? (
            <CompaniesKanbanBoard
              filters={filters}
              visibleColumnIds={visibleColumnIds}
              onQuickAction={handleQuickAction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
            />
          ) : (
            <CompaniesListView filters={filters} />
          )}
        </div>
      </div>

      <EntityCsvImportModal
        open={isImportOpen}
        title="Import Companies"
        entityLabel="Company"
        fields={[...COMPANY_IMPORT_FIELDS]}
        owners={ACTIVITY_OWNERS}
        statuses={COMPANY_STATUSES}
        sources={COMPANY_INDUSTRIES}
        defaultOwner={defaults.defaultOwner}
        defaultStatus={defaults.defaultStatus}
        defaultSource={defaults.defaultSource}
        requiredHint="Required: Company Name"
        identityColumnLabel="Website"
        sourceFieldLabel="Default industry"
        skipDuplicatesLabel="Skip rows whose company name already exists"
        updateExistingLabel="Match by company name and overwrite mapped fields"
        suggestMapping={suggestCompanyMapping}
        preview={(rows, mapping, settings) =>
          previewCompanyImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus as CompanyStatus,
            defaultSource: settings.defaultSource,
          })
        }
        apply={(rows, mapping, settings) => {
          const summary = applyCompanyImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus as CompanyStatus,
            defaultSource: settings.defaultSource,
          });
          void tryCrmCompany(() =>
            importCrmCompanies({
              rows: rows.map((row) => ({ ...row })),
            }),
          );
          return summary;
        }}
        downloadErrorReport={downloadCompanyImportErrorReport}
        sampleTemplate={sampleCompanyCsvTemplate()}
        sampleFilename="companies-import-template.csv"
        onClose={() => setImportOpen(false)}
        onImported={(s) => {
          setBulkFlash(
            `Imported ${s.imported} · updated ${s.updated} · skipped ${s.skipped}`,
          );
          setTotalCompanies(
            listCompanyGroups().reduce((n, g) => n + g.companies.length, 0),
          );
        }}
      />

      <MergeRecordsModal
        open={isMergeOpen}
        mode="companies"
        initialIds={
          selectedIds.length === 2
            ? [selectedIds[0]!, selectedIds[1]!]
            : null
        }
        onClose={() => setMergeOpen(false)}
        onMerged={(msg) => {
          setBulkFlash(msg);
          setSelectedIds([]);
          setTotalCompanies(
            listCompanyGroups().reduce((n, g) => n + g.companies.length, 0),
          );
        }}
      />
    </div>
  );
}
