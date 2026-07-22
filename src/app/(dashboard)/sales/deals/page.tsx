"use client";

import { useMemo, useState } from "react";
import {
  EntityHeader,
  type PipelineOption,
} from "@/components/sales/EntityHeader";
import { DealsKanbanBoard } from "@/components/sales/deals/DealsKanbanBoard";
import { DealsListView } from "@/components/sales/deals/DealsListView";
import {
  DEAL_PIPELINES,
  DEAL_PIPELINE_STAGES,
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import {
  FilterDealsPanel,
  EMPTY_DEAL_FILTERS,
  type DealFilters,
} from "@/components/sales/deals/FilterDealsPanel";

const PIPELINE_OPTIONS: PipelineOption[] = DEAL_PIPELINES.map((pipeline) => ({
  label: pipeline,
  value: pipeline,
}));

export default function DealsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<DealFilters>(EMPTY_DEAL_FILTERS);
  const [activePipeline, setActivePipeline] = useState<DealPipeline>(
    DEAL_PIPELINES[0],
  );

  const [allStages] =
    useState<Record<DealPipeline, DealStage[]>>(DEAL_PIPELINE_STAGES);

  const currentPipelineStages = (allStages && allStages[activePipeline]) || [];

  const stageOptions = useMemo(() => {
    return currentPipelineStages.map((stage) => stage.title);
  }, [currentPipelineStages]);

  const totalCount = useMemo(() => {
    return currentPipelineStages.reduce(
      (acc, stage) => acc + (stage?.deals?.length || 0),
      0,
    );
  }, [currentPipelineStages]);

  function handleToggleField(field: string) {
    setFilters((prev) => {
      const current = prev.stages || [];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, stages: next };
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 pr-4">
      <EntityHeader
        entityLabel="Deal"
        createRoute="/sales/deals/create"
        totalCount={totalCount}
        viewMode={viewMode}
        onViewChange={setViewMode}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((v) => !v)}
        pipelineOptions={PIPELINE_OPTIONS}
        activePipeline={activePipeline}
        onPipelineChange={(pipeline) => {
          setActivePipeline(pipeline as DealPipeline);
          setFilters(EMPTY_DEAL_FILTERS);
        }}
      />

      <div className="mt-6 flex items-start gap-6">
        {isFilterOpen && (
          <div className="sticky top-6">
            <FilterDealsPanel
              stageOptions={stageOptions}
              filters={filters}
              onToggleField={handleToggleField}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        {/* Dynamic View Display */}
        <div className="flex-1 overflow-x-auto">
          {viewMode === "kanban" ? (
            <DealsKanbanBoard pipeline={activePipeline} filters={filters} />
          ) : (
            <DealsListView pipeline={activePipeline} filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
