"use client";

import { useEffect, useState } from "react";
import { EntityHeader } from "@/components/sales/EntityHeader";
import { LeadKanbanBoard } from "@/components/sales/leads/LeadKanbanBoard";
import { LeadListView } from "@/components/sales/leads/LeadListView";
import {
  FilterLeadsPanel,
  EMPTY_LEAD_FILTERS,
  type LeadFilters,
} from "@/components/sales/leads/FilterLeadsPanel";
import { listLeadColumns } from "@/lib/leads/store";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [totalLeads, setTotalLeads] = useState(0);

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

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      <FocusHighlight />
      <EntityHeader
        entityLabel="Lead"
        createRoute="/sales/leads/create"
        totalCount={totalLeads}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
      />

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

        <div
          key={viewMode}
          className={cn("flex-1 overflow-x-auto", viewEnter)}
        >
          {viewMode === "kanban" ? (
            <LeadKanbanBoard filters={filters} />
          ) : (
            <LeadListView filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
