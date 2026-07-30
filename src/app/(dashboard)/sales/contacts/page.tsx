"use client";

import { useState } from "react";
import { EntityHeader } from "@/components/sales/EntityHeader";
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

  return (
    <div className="h-screen bg-slate-50 p-2 pr-3 dark:bg-zinc-950">
      <FocusHighlight />
      <EntityHeader
        entityLabel="Contact"
        columnOptions={columns}
        onColumnToggle={(id) =>
          setColumns((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
          )
        }
        onColumnReorder={reorderColumn}
        createRoute="/sales/contacts/create"
        totalCount={totalContacts}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
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
            />
          ) : (
            <ContactsListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
