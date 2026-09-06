"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import { TASK_FILTER_FIELDS, TASK_SYSTEM_GROUPS } from "@/lib/filters/catalogs";
import type { DeepFilterValue } from "@/lib/filters/types";
import type { TaskFilters } from "@/lib/tasks/types";

function toDeep(filters: TaskFilters): DeepFilterValue {
  return {
    groups: {
      status: filters.statuses,
      priority: filters.priorities,
      type: filters.types,
      system: filters.systemDefined ?? [],
    },
    clauses: filters.clauses ?? [],
  };
}

function fromDeep(value: DeepFilterValue, prev: TaskFilters): TaskFilters {
  return {
    ...prev,
    statuses: (value.groups.status ?? []) as TaskFilters["statuses"],
    priorities: (value.groups.priority ?? []) as TaskFilters["priorities"],
    types: (value.groups.type ?? []) as TaskFilters["types"],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface FilterPanelProps {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  onClose?: () => void;
}

export function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Tasks"
      applied={toDeep(filters)}
      fields={TASK_FILTER_FIELDS}
      systemGroups={TASK_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next, filters))}
      onClose={onClose}
    />
  );
}
