"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  MEETING_FILTER_FIELDS,
  MEETING_SYSTEM_GROUPS,
} from "@/lib/filters/catalogs";
import {
  EMPTY_MEETING_FILTERS,
  type MeetingFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_MEETING_FILTERS, type MeetingFilters };

function toDeep(filters: MeetingFilters): DeepFilterValue {
  return {
    groups: {
      status: filters.statuses,
      type: filters.types,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): MeetingFilters {
  return {
    statuses: (value.groups.status ?? []) as MeetingFilters["statuses"],
    types: (value.groups.type ?? []) as MeetingFilters["types"],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface MeetingsFilterPanelProps {
  filters: MeetingFilters;
  onChange: (next: MeetingFilters) => void;
  onClose?: () => void;
}

export function MeetingsFilterPanel({
  filters,
  onChange,
  onClose,
}: MeetingsFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Meetings by"
      applied={toDeep(filters)}
      fields={MEETING_FILTER_FIELDS}
      systemGroups={MEETING_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
