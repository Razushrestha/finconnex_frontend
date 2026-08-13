"use client";

import { useEffect, useState } from "react";
import {
  EntityHeader,
  type SortDirection,
  type ActionOption,
} from "@/components/sales/EntityHeader";
import {
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  Tag,
  ShieldCheck,
  Download,
  Sparkles,
  GitMerge,
} from "lucide-react";
import { ContactsKanbanBoard } from "@/components/sales/contacts/ContactsKanbanBoard";
import { ContactsListView } from "@/components/sales/contacts/ContactsListView";
import {
  FilterContactsPanel,
  EMPTY_CONTACT_FILTERS,
  type ContactFilters,
} from "@/components/sales/contacts/FilterContactsPanel";
import { CONTACT_GROUPS, CONTACT_SOURCES, CONTACT_STATUSES } from "@/lib/contacts/types";
import { listContactGroups } from "@/lib/contacts/store";
import {
  applyContactImport,
  CONTACT_IMPORT_FIELDS,
  defaultContactImportSettings,
  downloadContactImportErrorReport,
  exportContactsCsv,
  previewContactImport,
  sampleContactCsvTemplate,
  suggestContactMapping,
} from "@/lib/contacts/import";
import { EntityCsvImportModal } from "@/components/sales/import/EntityCsvImportModal";
import { MergeRecordsModal } from "@/components/sales/merge/MergeRecordsModal";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { SORT_OPTIONS } from "../leads/page";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import type { ContactSource, ContactStatus } from "@/lib/contacts/types";

const CONTACT_VIEW_MODE_KEY = "finconnex.contacts.view-mode";

type ContactViewMode = "kanban" | "list";

function loadContactViewMode(): ContactViewMode {
  if (typeof window === "undefined") return "kanban";
  try {
    const raw = localStorage.getItem(CONTACT_VIEW_MODE_KEY);
    if (raw === "list" || raw === "kanban") return raw;
  } catch {
    /* ignore */
  }
  return "kanban";
}

function persistContactViewMode(mode: ContactViewMode) {
  try {
    localStorage.setItem(CONTACT_VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

const DEFAULT_CONTACT_COLUMNS = CONTACT_GROUPS.map((group) => ({
  id: group.id,
  label: group.title,
  visible: true,
}));

export default function ContactsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ContactViewMode>("kanban");
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_CONTACT_FILTERS);
  const [columns, setColumns] = useState(DEFAULT_CONTACT_COLUMNS);

  // Sort state — field and direction are tracked separately now, matching
  // the EntityHeader "Sort By" panel (field select + Ascending/Descending).
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
  const [isImportOpen, setImportOpen] = useState(false);
  const [isMergeOpen, setMergeOpen] = useState(false);
  const [totalContacts, setTotalContacts] = useState(0);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const defaults = defaultContactImportSettings();

  useEffect(() => {
    setViewMode(loadContactViewMode());
  }, []);

  useEffect(() => {
    function refresh() {
      setTotalContacts(
        listContactGroups().reduce((n, g) => n + g.contacts.length, 0),
      );
    }
    refresh();
    return onRulesChange(refresh);
  }, []);

  useEffect(() => {
    if (!bulkFlash) return;
    const t = window.setTimeout(() => setBulkFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [bulkFlash]);

  function handleViewChange(mode: ContactViewMode) {
    setViewMode(mode);
    persistContactViewMode(mode);
  }

  function exportTasks() {
    const n = exportContactsCsv();
    setBulkFlash(`Exported ${n} contacts`);
  }

  function exportSelected() {
    if (!selectedIds.length) return;
    const n = exportContactsCsv({ ids: selectedIds });
    setBulkFlash(`Exported ${n} selected contacts`);
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

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
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
      id: "merge-contacts",
      label: "Merge Contacts",
      icon: <GitMerge className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => setMergeOpen(true),
    },
    {
      id: "export-tasks",
      label: "Export Contacts",
      icon: <Download className="h-3.5 w-3.5 text-slate-400" />,
      onClick: () => exportTasks(),
    },
  ];

  function openPrintView() {
    console.log("print view clicked");
  }

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
      <EntityHeader
        entityLabel="Contact"
        actionOptions={actionOptions}
        createRoute="/sales/contacts/create"
        importOptions={[
          {
            id: "import-contacts",
            label: "Import Contacts",
            badge: "New",
            onClick: () => setImportOpen(true),
          },
          {
            id: "import-notes",
            label: "Import Notes",
            onClick: () =>
              setBulkFlash("Notes import comes later — use Import Contacts for CSV"),
          },
        ]}
        totalCount={totalContacts}
        viewMode={viewMode}
        onViewChange={handleViewChange}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        activeSortDirection={activeSortDirection}
        onSortChange={(field, direction) => {
          setActiveSort(field);
          setActiveSortDirection(direction);
        }}
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
          onMailMerge={() => setMergeOpen(true)}
          onMassConvert={() => console.log("mass convert clicked")}
          onDelete={() => console.log("delete clicked")}
          onExportSelectedRecords={() => exportSelected()}
        />
      ) : bulkFlash ? (
        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          {bulkFlash}
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-4">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterContactsPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div key={viewMode} className={cn("flex-1 overflow-x-auto", viewEnter)}>
          {viewMode === "kanban" ? (
            <ContactsKanbanBoard
              filters={filters}
              visibleColumnIds={visibleColumnIds}
              sortValue={activeSort}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
            />
          ) : (
            <ContactsListView filters={filters} sortValue={activeSort} />
          )}
        </div>
      </div>

      <EntityCsvImportModal
        open={isImportOpen}
        title="Import Contacts"
        entityLabel="Contact"
        fields={[...CONTACT_IMPORT_FIELDS]}
        owners={ACTIVITY_OWNERS}
        statuses={CONTACT_STATUSES}
        sources={CONTACT_SOURCES}
        defaultOwner={defaults.defaultOwner}
        defaultStatus={defaults.defaultStatus}
        defaultSource={defaults.defaultSource}
        suggestMapping={suggestContactMapping}
        preview={(rows, mapping, settings) =>
          previewContactImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus as ContactStatus,
            defaultSource: settings.defaultSource as ContactSource,
          })
        }
        apply={(rows, mapping, settings) =>
          applyContactImport(rows, mapping, {
            skipDuplicates: settings.skipDuplicates,
            updateExisting: settings.updateExisting,
            defaultOwner: settings.defaultOwner,
            defaultStatus: settings.defaultStatus as ContactStatus,
            defaultSource: settings.defaultSource as ContactSource,
          })
        }
        downloadErrorReport={downloadContactImportErrorReport}
        sampleTemplate={sampleContactCsvTemplate()}
        sampleFilename="contacts-import-template.csv"
        onClose={() => setImportOpen(false)}
        onImported={(s) => {
          setBulkFlash(
            `Imported ${s.imported} · updated ${s.updated} · skipped ${s.skipped}`,
          );
          setTotalContacts(
            listContactGroups().reduce((n, g) => n + g.contacts.length, 0),
          );
        }}
      />

      <MergeRecordsModal
        open={isMergeOpen}
        mode="contacts"
        initialIds={
          selectedIds.length === 2
            ? [selectedIds[0]!, selectedIds[1]!]
            : null
        }
        onClose={() => setMergeOpen(false)}
        onMerged={(msg) => {
          setBulkFlash(msg);
          setSelectedIds([]);
          setTotalContacts(
            listContactGroups().reduce((n, g) => n + g.contacts.length, 0),
          );
        }}
      />
    </div>
  );
}
