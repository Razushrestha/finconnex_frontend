"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import { CALL_FILTER_FIELDS, CALL_SYSTEM_GROUPS } from "@/lib/filters/catalogs";
import {
  EMPTY_CALL_FILTERS,
  type CallFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_CALL_FILTERS, type CallFilters };

function toDeep(filters: CallFilters): DeepFilterValue {
  return {
    groups: {
      status: filters.statuses,
      type: filters.types,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): CallFilters {
  return {
    statuses: (value.groups.status ?? []) as CallFilters["statuses"],
    types: (value.groups.type ?? []) as CallFilters["types"],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface CallsFilterPanelProps {
  filters: CallFilters;
  onChange: (next: CallFilters) => void;
  onClose?: () => void;
}

export function CallsFilterPanel({
  filters,
  onChange,
  onClose,
}: CallsFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Calls"
      applied={toDeep(filters)}
      fields={CALL_FILTER_FIELDS}
      systemGroups={CALL_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
