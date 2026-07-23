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

export default function CompaniesPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<CompanyFilters>(EMPTY_COMPANY_FILTERS);

  function toggleFilterField(field: string) {
    setFilters((prev) => {
      const next = prev.statuses.includes(field)
        ? prev.statuses.filter((f) => f !== field)
        : [...prev.statuses, field];
      return { statuses: next };
    });
  }

  const totalCompanies = COMPANY_GROUPS.reduce(
    (sum, group) => sum + group.companies.length,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      <EntityHeader
        entityLabel="Company"
        entityLabelPlural="Companies"
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

        <div
          key={viewMode}
          className={cn("flex-1 overflow-x-auto", viewEnter)}
        >
          {viewMode === "kanban" ? (
            <CompaniesKanbanBoard filters={filters} />
          ) : (
            <CompaniesListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
