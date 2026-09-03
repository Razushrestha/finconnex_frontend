"use client";

import { useEffect, useMemo, useState } from "react";
import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  LEAD_SYSTEM_GROUPS,
  WEBSITE_ACTIVITY_FIELDS,
  leadFilterFields,
} from "@/lib/filters/catalogs";
import {
  EMPTY_LEAD_FILTERS,
  type LeadFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";
import {
  listActiveCustomFieldsForEntity,
  onCustomFieldsChange,
} from "@/lib/custom-fields/store";

export { EMPTY_LEAD_FILTERS, type LeadFilters };

function toDeep(filters: LeadFilters): DeepFilterValue {
  return {
    groups: {
      source: filters.sources,
      status: filters.statuses,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): LeadFilters {
  return {
    sources: value.groups.source ?? [],
    statuses: value.groups.status ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface FilterLeadsPanelProps {
  filters: LeadFilters;
  onChange: (next: LeadFilters) => void;
  onClose?: () => void;
}

export function FilterLeadsPanel({
  filters,
  onChange,
  onClose,
}: FilterLeadsPanelProps) {
  const [customTick, setCustomTick] = useState(0);
  useEffect(() => onCustomFieldsChange(() => setCustomTick((n) => n + 1)), []);
  const fields = useMemo(
    () => leadFilterFields(listActiveCustomFieldsForEntity("Lead")),
    [customTick],
  );
  return (
    <DeepFilterPanel
      title="Filter Leads by"
      applied={toDeep(filters)}
      fields={fields}
      systemGroups={LEAD_SYSTEM_GROUPS}
      websiteFields={WEBSITE_ACTIVITY_FIELDS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
