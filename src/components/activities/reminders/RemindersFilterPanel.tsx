"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  REMINDER_FILTER_FIELDS,
  REMINDER_SYSTEM_GROUPS,
} from "@/lib/filters/catalogs";
import type { DeepFilterValue } from "@/lib/filters/types";
import type { ReminderFilters } from "@/lib/reminders/types";

function toDeep(filters: ReminderFilters): DeepFilterValue {
  return {
    groups: {
      status: filters.statuses,
      type: filters.types,
      method: filters.methods,
      owner: filters.owners,
      system: filters.systemDefined ?? [],
    },
    clauses: filters.clauses ?? [],
  };
}

function fromDeep(value: DeepFilterValue): ReminderFilters {
  return {
    statuses: (value.groups.status ?? []) as ReminderFilters["statuses"],
    types: (value.groups.type ?? []) as ReminderFilters["types"],
    methods: (value.groups.method ?? []) as ReminderFilters["methods"],
    owners: value.groups.owner ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface RemindersFilterPanelProps {
  filters: ReminderFilters;
  counts?: Partial<Record<string, number>>;
  onChange: (next: ReminderFilters) => void;
  onClose?: () => void;
}

export function RemindersFilterPanel({
  filters,
  onChange,
  onClose,
}: RemindersFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Reminders"
      applied={toDeep(filters)}
      fields={REMINDER_FILTER_FIELDS}
      systemGroups={REMINDER_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
