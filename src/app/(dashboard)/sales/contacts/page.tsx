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

export default function ContactsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_CONTACT_FILTERS);

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

  const totalContacts = CONTACT_GROUPS.reduce(
    (sum, group) => sum + group.contacts.length,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      <EntityHeader
        entityLabel="Contact"
        createRoute="/sales/contacts/create"
        totalCount={totalContacts}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
      />

      <div className="mt-6 flex items-start gap-6">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterContactsPanel
              filters={filters}
              onToggleField={toggleFilterField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          {viewMode === "kanban" ? (
            <ContactsKanbanBoard filters={filters} />
          ) : (
            <ContactsListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
