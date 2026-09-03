"use client";

import { useEffect, useMemo, useState } from "react";
import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import { dealFilterFields } from "@/lib/filters/catalogs";
import {
  EMPTY_DEAL_FILTERS,
  type DealFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue, FilterSystemGroup } from "@/lib/filters/types";
import {
  listActiveCustomFieldsForEntity,
  onCustomFieldsChange,
} from "@/lib/custom-fields/store";

export { EMPTY_DEAL_FILTERS, type DealFilters };

function toDeep(filters: DealFilters): DeepFilterValue {
  return {
    groups: { stage: filters.stages, system: filters.systemDefined },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): DealFilters {
  return {
    stages: value.groups.stage ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface FilterDealsPanelProps {
  stageOptions: string[];
  filters: DealFilters;
  onChange: (next: DealFilters) => void;
  onClose?: () => void;
}

export function FilterDealsPanel({
  stageOptions,
  filters,
  onChange,
  onClose,
}: FilterDealsPanelProps) {
  const [customTick, setCustomTick] = useState(0);
  useEffect(() => onCustomFieldsChange(() => setCustomTick((n) => n + 1)), []);
  const fields = useMemo(
    () => dealFilterFields(listActiveCustomFieldsForEntity("Deal")),
    [customTick],
  );
  const systemGroups: FilterSystemGroup[] = [
    { id: "stage", title: "Stage", options: stageOptions },
  ];
  return (
    <DeepFilterPanel
      title="Filter Deals by"
      applied={toDeep(filters)}
      fields={fields}
      systemGroups={systemGroups}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
