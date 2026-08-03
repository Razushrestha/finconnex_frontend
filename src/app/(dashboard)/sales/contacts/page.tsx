"use client";

import { useState } from "react";
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
} from "lucide-react";
import { ContactsKanbanBoard } from "@/components/sales/contacts/ContactsKanbanBoard";
import { ContactsListView } from "@/components/sales/contacts/ContactsListView";
import {
  FilterContactsPanel,
  EMPTY_CONTACT_FILTERS,
  type ContactFilters,
} from "@/components/sales/contacts/FilterContactsPanel";
import { CONTACT_GROUPS } from "@/lib/contacts/types";
import { viewEnter } from "@/lib/motion";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "../leads/page";

const DEFAULT_CONTACT_COLUMNS = CONTACT_GROUPS.map((group) => ({
  id: group.id,
  label: group.title,
  visible: true,
}));

export default function ContactsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_CONTACT_FILTERS);
  const [columns, setColumns] = useState(DEFAULT_CONTACT_COLUMNS);

  // Sort state — field and direction are tracked separately now, matching
  // the EntityHeader "Sort By" panel (field select + Ascending/Descending).
  const [activeSort, setActiveSort] = useState("Sort");
  const [activeSortDirection, setActiveSortDirection] =
    useState<SortDirection>("asc");

  // TODO: wire these up to the actual modals/handlers once they exist.
  const [isMassTransferOpen, setMassTransferOpen] = useState(false);
  const [isMassDeleteOpen, setMassDeleteOpen] = useState(false);
  const [isMassUpdateOpen, setMassUpdateOpen] = useState(false);
  const [isManageTagsOpen, setManageTagsOpen] = useState(false);
  const [isAssignmentRulesOpen, setAssignmentRulesOpen] = useState(false);

  function exportTasks() {
    console.log("export tasks clicked");
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

  const totalContacts = CONTACT_GROUPS.reduce(
    (sum, group) => sum + group.contacts.length,
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
    <div className="h-screen bg-slate-50 p-2 pr-3 dark:bg-zinc-950">
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
            onClick: () => console.log("button clicked"),
          },
          {
            id: "import-notes",
            label: "Import Notes",
            onClick: () => console.log("button clicked"),
          },
        ]}
        totalCount={totalContacts}
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
        footerOptions={footerOptions}
      />

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
            />
          ) : (
            <ContactsListView filters={filters} sortValue={activeSort} />
          )}
        </div>
      </div>
    </div>
  );
}
