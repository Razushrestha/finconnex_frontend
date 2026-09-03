"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  MESSAGE_FILTER_FIELDS,
  MESSAGE_SYSTEM_GROUPS,
} from "@/lib/filters/catalogs";
import {
  EMPTY_MESSAGE_FILTERS,
  type MessageFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_MESSAGE_FILTERS, type MessageFilters };

function toDeep(filters: MessageFilters): DeepFilterValue {
  return {
    groups: {
      type: filters.types,
      status: filters.statuses,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): MessageFilters {
  return {
    types: (value.groups.type ?? []) as MessageFilters["types"],
    statuses: (value.groups.status ?? []) as MessageFilters["statuses"],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface MessagesFilterPanelProps {
  filters: MessageFilters;
  onChange: (next: MessageFilters) => void;
  onClose?: () => void;
}

export function MessagesFilterPanel({
  filters,
  onChange,
  onClose,
}: MessagesFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Messages by"
      applied={toDeep(filters)}
      fields={MESSAGE_FILTER_FIELDS}
      systemGroups={MESSAGE_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
