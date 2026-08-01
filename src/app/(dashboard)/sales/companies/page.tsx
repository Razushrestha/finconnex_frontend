"use client";

import { useState } from "react";
import { EntityHeader } from "@/components/sales/EntityHeader";
import { CompaniesKanbanBoard } from "@/components/sales/companies/CompaniesKanbanBoard";
import { CompaniesListView } from "@/components/sales/companies/CompaniesListView";
import {
  FilterCompaniesPanel,
  EMPTY_COMPANY_FILTERS,
  type CompanyFilters,
} from "@/components/sales/companies/FilterCompaniesPanel";
import { COMPANY_GROUPS } from "@/lib/companies/types";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";

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

  function toggleFilterField(field: string) {
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

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      <EntityHeader
        entityLabel="Company"
        entityLabelPlural="Companies"
        columnOptions={columns}
        onColumnToggle={(id) =>
          setColumns((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
          )
        }
        onColumnReorder={reorderColumn}
        createRoute="/sales/companies/create"
        totalCount={totalCompanies}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
      />

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
            />
          ) : (
            <CompaniesListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
